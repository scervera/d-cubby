module Api
  module V1
    class DashboardController < BaseController
      CATEGORY_SQL = <<~SQL.squish
        CASE
          WHEN active_storage_blobs.content_type LIKE 'image/%' THEN 'image'
          WHEN active_storage_blobs.content_type LIKE 'video/%' THEN 'video'
          WHEN active_storage_blobs.content_type LIKE 'audio/%' THEN 'audio'
          WHEN active_storage_blobs.content_type = 'application/pdf' THEN 'pdf'
          ELSE 'document'
        END
      SQL

      # GET /api/v1/dashboard/stats — counts and storage of assets not in the recycle bin.
      def stats
        assets = tenant_scope(Dam::Asset.unscoped).where(deleted_at: nil)
        by_category = assets.joins(file_attachment: :blob)
                            .group(Arel.sql(CATEGORY_SQL))
                            .pluck(Arel.sql(CATEGORY_SQL), Arel.sql("COUNT(*)"), Arel.sql("COALESCE(SUM(active_storage_blobs.byte_size), 0)"))
        render_success(
          total_assets: assets.count,
          storage_bytes: by_category.sum { |_, _, bytes| bytes.to_i },
          by_category: by_category.to_h { |category, count, bytes| [ category, { count: count, bytes: bytes.to_i } ] },
          users: Current.tenant.users.active.count
        )
      end
    end
  end
end
