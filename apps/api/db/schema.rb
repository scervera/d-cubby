# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_24_203113) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "dam_asset_tags", force: :cascade do |t|
    t.bigint "asset_id", null: false
    t.datetime "created_at", null: false
    t.bigint "tag_id", null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_id", "tag_id"], name: "index_dam_asset_tags_on_asset_id_and_tag_id"
    t.index ["asset_id"], name: "index_dam_asset_tags_on_asset_id"
    t.index ["tag_id"], name: "index_dam_asset_tags_on_tag_id"
    t.index ["tenant_id", "asset_id"], name: "index_dam_asset_tags_on_tenant_id_and_asset_id"
    t.index ["tenant_id", "tag_id"], name: "index_dam_asset_tags_on_tenant_id_and_tag_id"
    t.index ["tenant_id"], name: "index_dam_asset_tags_on_tenant_id"
  end

  create_table "dam_assets", force: :cascade do |t|
    t.datetime "ai_auto_tagged_at"
    t.string "ai_tagging_error"
    t.boolean "auto_imported", default: false
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "derivative_kind", default: "original", null: false
    t.text "description"
    t.jsonb "edit_recipe", default: {}, null: false
    t.text "exif_data"
    t.integer "image_height"
    t.integer "image_width"
    t.bigint "import_scan_id"
    t.string "lineage_id"
    t.string "name"
    t.string "original_path"
    t.bigint "parent_asset_id"
    t.datetime "purge_after"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.integer "video_height"
    t.integer "video_width"
    t.integer "visibility_level", default: 0, null: false
    t.bigint "watched_folder_id"
    t.index ["auto_imported"], name: "index_dam_assets_on_auto_imported"
    t.index ["deleted_at"], name: "index_dam_assets_on_deleted_at"
    t.index ["import_scan_id"], name: "index_dam_assets_on_import_scan_id"
    t.index ["original_path"], name: "index_dam_assets_on_original_path"
    t.index ["parent_asset_id"], name: "index_dam_assets_on_parent_asset_id"
    t.index ["purge_after"], name: "index_dam_assets_on_purge_after"
    t.index ["tenant_id", "created_at"], name: "index_dam_assets_on_tenant_id_and_created_at"
    t.index ["tenant_id", "deleted_at", "created_at"], name: "index_dam_assets_on_tenant_id_and_deleted_at_and_created_at"
    t.index ["tenant_id", "lineage_id"], name: "index_dam_assets_on_tenant_id_and_lineage_id"
    t.index ["tenant_id"], name: "index_dam_assets_on_tenant_id"
    t.index ["user_id"], name: "index_dam_assets_on_user_id"
    t.index ["visibility_level"], name: "index_dam_assets_on_visibility_level"
    t.index ["watched_folder_id"], name: "index_dam_assets_on_watched_folder_id"
  end

  create_table "dam_collection_assets", force: :cascade do |t|
    t.bigint "asset_id", null: false
    t.bigint "collection_id", null: false
    t.datetime "created_at", null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_id"], name: "index_dam_collection_assets_on_asset_id"
    t.index ["collection_id"], name: "index_dam_collection_assets_on_collection_id"
    t.index ["tenant_id"], name: "index_dam_collection_assets_on_tenant_id"
  end

  create_table "dam_collections", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "is_public"
    t.string "name"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["tenant_id"], name: "index_dam_collections_on_tenant_id"
    t.index ["user_id"], name: "index_dam_collections_on_user_id"
  end

  create_table "dam_drop_zone_files", force: :cascade do |t|
    t.bigint "asset_id", null: false
    t.datetime "created_at", null: false
    t.bigint "drop_zone_id", null: false
    t.text "metadata"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.datetime "uploaded_at", null: false
    t.bigint "uploaded_by_id", null: false
    t.index ["asset_id"], name: "index_dam_drop_zone_files_on_asset_id"
    t.index ["drop_zone_id"], name: "index_dam_drop_zone_files_on_drop_zone_id"
    t.index ["tenant_id"], name: "index_dam_drop_zone_files_on_tenant_id"
    t.index ["uploaded_at"], name: "index_dam_drop_zone_files_on_uploaded_at"
    t.index ["uploaded_by_id"], name: "index_dam_drop_zone_files_on_uploaded_by_id"
  end

  create_table "dam_drop_zone_subscriptions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "drop_zone_id", null: false
    t.text "notification_preferences"
    t.datetime "subscribed_at", null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["drop_zone_id", "user_id"], name: "index_dam_drop_zone_subscriptions_on_drop_zone_id_and_user_id", unique: true
    t.index ["drop_zone_id"], name: "index_dam_drop_zone_subscriptions_on_drop_zone_id"
    t.index ["tenant_id"], name: "index_dam_drop_zone_subscriptions_on_tenant_id"
    t.index ["user_id"], name: "index_dam_drop_zone_subscriptions_on_user_id"
  end

  create_table "dam_drop_zones", force: :cascade do |t|
    t.text "accepted_file_types"
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "is_active", default: true, null: false
    t.string "name", null: false
    t.bigint "owner_id", null: false
    t.text "preset_tags"
    t.text "settings"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["is_active"], name: "index_dam_drop_zones_on_is_active"
    t.index ["owner_id"], name: "index_dam_drop_zones_on_owner_id"
    t.index ["tenant_id"], name: "index_dam_drop_zones_on_tenant_id"
  end

  create_table "dam_face_detections", force: :cascade do |t|
    t.bigint "asset_id", null: false
    t.jsonb "bounding_box", default: {}, null: false
    t.float "confidence"
    t.datetime "created_at", null: false
    t.datetime "detected_at"
    t.binary "embedding"
    t.string "face_engine_id"
    t.bigint "person_id"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_id"], name: "index_dam_face_detections_on_asset_id"
    t.index ["face_engine_id"], name: "index_dam_face_detections_on_face_engine_id"
    t.index ["person_id"], name: "index_dam_face_detections_on_person_id"
    t.index ["tenant_id"], name: "index_dam_face_detections_on_tenant_id"
  end

  create_table "dam_face_people", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "face_count", default: 0, null: false
    t.string "name", null: false
    t.bigint "tenant_id", null: false
    t.bigint "thumbnail_asset_id"
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_dam_face_people_on_name"
    t.index ["tenant_id", "name"], name: "index_dam_face_people_on_tenant_id_and_name", unique: true
    t.index ["tenant_id"], name: "index_dam_face_people_on_tenant_id"
    t.index ["thumbnail_asset_id"], name: "index_dam_face_people_on_thumbnail_asset_id"
  end

  create_table "dam_folder_scans", force: :cascade do |t|
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.text "error_details"
    t.integer "errors_count", default: 0
    t.integer "files_found", default: 0
    t.integer "files_processed", default: 0
    t.integer "files_skipped", default: 0
    t.datetime "started_at", null: false
    t.string "status", default: "running"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "watched_folder_id", null: false
    t.index ["started_at"], name: "index_dam_folder_scans_on_started_at"
    t.index ["status"], name: "index_dam_folder_scans_on_status"
    t.index ["tenant_id"], name: "index_dam_folder_scans_on_tenant_id"
    t.index ["watched_folder_id"], name: "index_dam_folder_scans_on_watched_folder_id"
  end

  create_table "dam_group_memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "group_id", null: false
    t.string "role", default: "member"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["group_id", "user_id"], name: "index_dam_group_memberships_on_group_id_and_user_id", unique: true
    t.index ["group_id"], name: "index_dam_group_memberships_on_group_id"
    t.index ["tenant_id"], name: "index_dam_group_memberships_on_tenant_id"
    t.index ["user_id"], name: "index_dam_group_memberships_on_user_id"
  end

  create_table "dam_groups", force: :cascade do |t|
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", null: false
    t.bigint "owner_id", null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_dam_groups_on_name"
    t.index ["owner_id", "active"], name: "index_dam_groups_on_owner_id_and_active"
    t.index ["owner_id"], name: "index_dam_groups_on_owner_id"
    t.index ["tenant_id"], name: "index_dam_groups_on_tenant_id"
  end

  create_table "dam_smart_folders", force: :cascade do |t|
    t.boolean "active", default: true
    t.string "color", default: "#A88BEA"
    t.datetime "created_at", null: false
    t.text "description"
    t.integer "group_id"
    t.string "match_logic", default: "any", null: false
    t.string "name", null: false
    t.boolean "pinned_to_sidebar", default: false
    t.text "shared_user_ids"
    t.integer "sort_order", default: 0
    t.text "tag_criteria", null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "visibility_level", default: "personal", null: false
    t.index ["group_id"], name: "index_dam_smart_folders_on_group_id"
    t.index ["name", "tenant_id"], name: "index_dam_smart_folders_on_name_and_tenant_id", unique: true
    t.index ["tenant_id"], name: "index_dam_smart_folders_on_tenant_id"
    t.index ["user_id", "active"], name: "index_dam_smart_folders_on_user_id_and_active"
    t.index ["user_id", "pinned_to_sidebar"], name: "index_dam_smart_folders_on_user_id_and_pinned_to_sidebar"
    t.index ["user_id", "sort_order"], name: "index_dam_smart_folders_on_user_id_and_sort_order"
    t.index ["user_id"], name: "index_dam_smart_folders_on_user_id"
    t.index ["visibility_level"], name: "index_dam_smart_folders_on_visibility_level"
  end

  create_table "dam_tags", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id", "name"], name: "index_dam_tags_on_tenant_id_and_name", unique: true
    t.index ["tenant_id"], name: "index_dam_tags_on_tenant_id"
  end

  create_table "dam_watch_folder_notifications", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "file_path"
    t.text "message", null: false
    t.json "metadata"
    t.string "status", default: "unread"
    t.bigint "tenant_id", null: false
    t.string "title", null: false
    t.string "type", null: false
    t.datetime "updated_at", null: false
    t.bigint "watched_folder_id", null: false
    t.index ["created_at"], name: "index_dam_watch_folder_notifications_on_created_at"
    t.index ["tenant_id"], name: "index_dam_watch_folder_notifications_on_tenant_id"
    t.index ["watched_folder_id", "status"], name: "idx_on_watched_folder_id_status_a9e0129e96"
    t.index ["watched_folder_id"], name: "index_dam_watch_folder_notifications_on_watched_folder_id"
  end

  create_table "dam_watched_folders", force: :cascade do |t|
    t.boolean "active", default: true
    t.text "auto_tags"
    t.datetime "created_at", null: false
    t.datetime "last_scanned_at"
    t.bigint "max_file_size_bytes", default: 10737418240
    t.string "name", null: false
    t.datetime "next_scan_at"
    t.string "path", null: false
    t.string "scan_frequency_unit", null: false
    t.integer "scan_frequency_value", null: false
    t.bigint "tenant_id", null: false
    t.integer "total_errors", default: 0
    t.integer "total_files_found", default: 0
    t.integer "total_files_processed", default: 0
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_dam_watched_folders_on_active"
    t.index ["next_scan_at"], name: "index_dam_watched_folders_on_next_scan_at"
    t.index ["tenant_id", "path"], name: "index_dam_watched_folders_on_tenant_id_and_path", unique: true
    t.index ["tenant_id"], name: "index_dam_watched_folders_on_tenant_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "name", null: false
    t.string "default_locale", default: "en", null: false
    t.integer "retention_days", default: 30, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "revoked_tokens", force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["expires_at"], name: "index_revoked_tokens_on_expires_at"
    t.index ["jti"], name: "index_revoked_tokens_on_jti", unique: true
  end

  create_table "solid_cache_entries", force: :cascade do |t|
    t.binary "key", null: false
    t.binary "value", null: false
    t.datetime "created_at", null: false
    t.bigint "key_hash", null: false
    t.integer "byte_size", null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "solid_queue_batch_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "batch_id", null: false
    t.datetime "created_at", null: false
    t.index ["batch_id"], name: "index_solid_queue_batch_executions_on_batch_id"
    t.index ["job_id"], name: "index_solid_queue_batch_executions_on_job_id", unique: true
  end

  create_table "solid_queue_batches", force: :cascade do |t|
    t.string "active_job_batch_id"
    t.string "description"
    t.text "on_finish"
    t.text "on_success"
    t.text "on_failure"
    t.text "metadata"
    t.integer "total_jobs", default: 0, null: false
    t.integer "completed_jobs", default: 0, null: false
    t.integer "failed_jobs", default: 0, null: false
    t.datetime "enqueued_at"
    t.datetime "finished_at"
    t.datetime "failed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active_job_batch_id"], name: "index_solid_queue_batches_on_active_job_batch_id", unique: true
    t.index ["finished_at"], name: "index_solid_queue_batches_on_finished_at"
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "queue_name", null: false
    t.string "class_name", null: false
    t.text "arguments"
    t.integer "priority", default: 0, null: false
    t.string "active_job_id"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "batch_id"
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["batch_id"], name: "index_solid_queue_jobs_on_batch_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.string "key", null: false
    t.string "schedule", null: false
    t.string "command", limit: 2048
    t.string "class_name"
    t.text "arguments"
    t.string "queue_name"
    t.integer "priority", default: 0
    t.boolean "static", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.bigint "organization_id", null: false
    t.string "name", null: false
    t.citext "email", null: false
    t.string "password_digest", null: false
    t.string "role", default: "viewer", null: false
    t.string "locale"
    t.datetime "disabled_at"
    t.boolean "password_change_required", default: false, null: false
    t.integer "token_version", default: 0, null: false
    t.datetime "last_sign_in_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["organization_id"], name: "index_users_on_organization_id"
    t.index ["role"], name: "index_users_single_owner", unique: true, where: "((role)::text = 'owner'::text)"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "dam_asset_tags", "dam_assets", column: "asset_id"
  add_foreign_key "dam_asset_tags", "dam_tags", column: "tag_id"
  add_foreign_key "dam_asset_tags", "organizations", column: "tenant_id"
  add_foreign_key "dam_assets", "dam_assets", column: "parent_asset_id", on_delete: :nullify
  add_foreign_key "dam_assets", "dam_folder_scans", column: "import_scan_id"
  add_foreign_key "dam_assets", "dam_watched_folders", column: "watched_folder_id"
  add_foreign_key "dam_assets", "organizations", column: "tenant_id"
  add_foreign_key "dam_assets", "users"
  add_foreign_key "dam_collection_assets", "dam_assets", column: "asset_id"
  add_foreign_key "dam_collection_assets", "dam_collections", column: "collection_id"
  add_foreign_key "dam_collection_assets", "organizations", column: "tenant_id"
  add_foreign_key "dam_collections", "organizations", column: "tenant_id"
  add_foreign_key "dam_collections", "users"
  add_foreign_key "dam_drop_zone_files", "dam_assets", column: "asset_id"
  add_foreign_key "dam_drop_zone_files", "dam_drop_zones", column: "drop_zone_id"
  add_foreign_key "dam_drop_zone_files", "organizations", column: "tenant_id"
  add_foreign_key "dam_drop_zone_files", "users", column: "uploaded_by_id"
  add_foreign_key "dam_drop_zone_subscriptions", "dam_drop_zones", column: "drop_zone_id"
  add_foreign_key "dam_drop_zone_subscriptions", "organizations", column: "tenant_id"
  add_foreign_key "dam_drop_zone_subscriptions", "users"
  add_foreign_key "dam_drop_zones", "organizations", column: "tenant_id"
  add_foreign_key "dam_drop_zones", "users", column: "owner_id"
  add_foreign_key "dam_face_detections", "dam_assets", column: "asset_id"
  add_foreign_key "dam_face_detections", "dam_face_people", column: "person_id"
  add_foreign_key "dam_face_detections", "organizations", column: "tenant_id"
  add_foreign_key "dam_face_people", "dam_assets", column: "thumbnail_asset_id"
  add_foreign_key "dam_face_people", "organizations", column: "tenant_id"
  add_foreign_key "dam_folder_scans", "dam_watched_folders", column: "watched_folder_id"
  add_foreign_key "dam_folder_scans", "organizations", column: "tenant_id"
  add_foreign_key "dam_group_memberships", "dam_groups", column: "group_id"
  add_foreign_key "dam_group_memberships", "organizations", column: "tenant_id"
  add_foreign_key "dam_group_memberships", "users"
  add_foreign_key "dam_groups", "organizations", column: "tenant_id"
  add_foreign_key "dam_groups", "users", column: "owner_id"
  add_foreign_key "dam_smart_folders", "dam_groups", column: "group_id", on_delete: :nullify
  add_foreign_key "dam_smart_folders", "organizations", column: "tenant_id"
  add_foreign_key "dam_smart_folders", "users"
  add_foreign_key "dam_tags", "organizations", column: "tenant_id"
  add_foreign_key "dam_watch_folder_notifications", "dam_watched_folders", column: "watched_folder_id"
  add_foreign_key "dam_watch_folder_notifications", "organizations", column: "tenant_id"
  add_foreign_key "dam_watched_folders", "organizations", column: "tenant_id"
  add_foreign_key "solid_queue_batch_executions", "solid_queue_batches", column: "batch_id", on_delete: :cascade
  add_foreign_key "solid_queue_batch_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "users", "organizations"
end
