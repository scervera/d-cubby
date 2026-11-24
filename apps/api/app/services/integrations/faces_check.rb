module Integrations
  # Lists Rekognition collections to prove the credentials and region work.
  class FacesCheck
    def call
      return Result.new(ok: false, message: "Face detection is not enabled") unless Dam.face_detection_enabled?

      require "aws-sdk-rekognition"
      client = Aws::Rekognition::Client.new(region: ENV.fetch("AWS_REGION", "us-east-1"))
      count = client.list_collections(max_results: 10).collection_ids.size
      Result.new(ok: true, message: "Connected to AWS Rekognition (#{count} collection(s) visible)")
    end
  end
end
