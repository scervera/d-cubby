class CreateOrganizationsAndUsers < ActiveRecord::Migration[8.1]
  def change
    enable_extension "citext"

    # One row per install (Organization.current). It is the DAM's tenant.
    create_table :organizations do |t|
      t.string :name, null: false
      t.string :default_locale, null: false, default: "en"
      t.integer :retention_days, null: false, default: 30
      t.timestamps
    end

    create_table :users do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.citext :email, null: false, index: { unique: true }
      t.string :password_digest, null: false
      t.string :role, null: false, default: "viewer"
      t.string :locale
      t.datetime :disabled_at
      t.boolean :password_change_required, null: false, default: false
      # Bumped on password change or disable; tokens carrying an older value are rejected.
      t.integer :token_version, null: false, default: 0
      t.datetime :last_sign_in_at
      t.timestamps
    end
    add_index :users, :role, unique: true, where: "role = 'owner'", name: "index_users_single_owner"

    # Tokens revoked by logout, kept until they would have expired anyway.
    create_table :revoked_tokens do |t|
      t.string :jti, null: false, index: { unique: true }
      t.datetime :expires_at, null: false, index: true
      t.datetime :created_at, null: false
    end
  end
end
