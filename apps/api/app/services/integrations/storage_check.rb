module Integrations
  # Writes, reads back and deletes a small object in the configured Active Storage service.
  class StorageCheck
    def call
      service = ActiveStorage::Blob.service
      key = "d-cubby-check/#{SecureRandom.hex(8)}"
      data = "d-cubby storage check #{Time.current.iso8601}"
      service.upload(key, StringIO.new(data), checksum: OpenSSL::Digest::MD5.base64digest(data))
      read = service.download(key)
      service.delete(key)
      return Result.new(ok: false, message: "Read back different data than was written") unless read == data

      Result.new(ok: true, message: "Wrote, read and deleted a test object (#{Integrations.storage_provider})")
    end
  end
end
