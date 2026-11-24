require "rails_helper"

# The dam gem mounted in D-cubby: its host contract, uploads and streaming.
RSpec.describe "DAM inside D-cubby", type: :request do
  let!(:owner) { create_user(role: "owner") }
  let(:editor) { create_user(role: "editor") }
  let(:viewer) { create_user(role: "viewer") }

  def upload(user, name: "sample.png")
    post "/api/v1/assets", params: { asset: { name: name, file: fixture_file_upload("sample.png", "image/png") } },
                           headers: auth_headers(user)
  end

  it "implements the user contract the gem expects" do
    expect(owner).to have_attributes(admin?: true, tenant_owner?: true, dam_writer?: true, tenant: organization)
    expect(editor).to have_attributes(admin?: false, tenant_owner?: false, dam_writer?: true)
    expect(viewer).to have_attributes(admin?: false, dam_writer?: false, disabled?: false)
    %i[assets collections smart_folders owned_groups owned_drop_zones subscribed_drop_zones].each do |assoc|
      expect(User.reflect_on_association(assoc)).to be_present
    end
  end

  it "lets editors upload into the organization and generates a thumbnail" do
    upload(editor)
    expect(response).to have_http_status(:created), response.body

    asset = Dam::Asset.sole
    expect(asset).to have_attributes(tenant_id: organization.id, user_id: editor.id)
    perform_enqueued_jobs(only: [ Dam::ThumbnailGenerationJob, Dam::AssetThumbnailJob ])
    expect(asset.reload.thumbnail).to be_attached
  end

  it "does not let viewers upload" do
    upload(viewer)
    expect(response).to have_http_status(:forbidden)
  end

  it "lists assets with URLs on the app's public address" do
    upload(editor)
    with_env("ACTIVE_STORAGE_HOST" => "https://dam.example.org") { get "/api/v1/assets", headers: auth_headers(viewer) }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("https://dam.example.org/rails/active_storage/")
  end

  it "streams with a token in the query string, and rejects revoked tokens" do
    upload(editor)
    asset = Dam::Asset.sole
    token = AuthToken.issue(viewer)

    get "/api/v1/assets/#{asset.id}/stream", params: { token: token }
    expect(response).to have_http_status(:ok)

    AuthToken.revoke(token)
    get "/api/v1/assets/#{asset.id}/stream", params: { token: token }
    expect(response.status).to be_in([ 401, 404 ])
  end

  it "uses the organization's retention days for the recycle bin" do
    organization.update!(retention_days: 7)
    upload(editor)
    asset = Dam::Asset.sole

    freeze_time do
      delete "/api/v1/assets/#{asset.id}", headers: auth_headers(editor)
      expect(asset.reload.purge_after).to eq(7.days.from_now)
    end
  end

  it "reports dashboard stats" do
    upload(editor)
    get "/api/v1/dashboard/stats", headers: auth_headers(viewer)

    expect(json).to include("total_assets" => 1, "users" => 3)
    expect(json.dig("by_category", "image", "count")).to eq(1)
    expect(json["storage_bytes"]).to be > 0
  end

  it "keeps watched folders inside the configured roots and away from non-admins" do
    root = Dir.mktmpdir
    allow(Dam.config).to receive(:watched_folder_roots).and_return([ root ])
    params = { watched_folder: { name: "Inbox", scan_frequency_value: 5, scan_frequency_unit: "minutes",
                                 max_file_size_bytes: 10.megabytes } }

    post "/api/v1/watched_folders", params: params.deep_merge(watched_folder: { path: "/etc" }), headers: auth_headers(owner)
    expect(response).to have_http_status(:unprocessable_content)

    post "/api/v1/watched_folders", params: params.deep_merge(watched_folder: { path: root }), headers: auth_headers(editor)
    expect(response).to have_http_status(:forbidden)

    post "/api/v1/watched_folders", params: params.deep_merge(watched_folder: { path: root }), headers: auth_headers(owner)
    expect(response).to have_http_status(:created)
    expect(Dam::WatchedFolder.sole.tenant).to eq(organization)
  ensure
    FileUtils.rm_rf(root) if root
  end
end
