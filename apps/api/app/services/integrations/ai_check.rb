module Integrations
  # Asks the configured AI provider to tag a small bundled sample image.
  class AiCheck
    SAMPLE = Rails.root.join("lib/integrations/sample.png")

    def call
      return Result.new(ok: false, message: "AI auto-tagging is not configured") unless Dam.ai_tagging_enabled?

      provider = Dam::Ai::Providers.current
      result = provider.analyze_image(
        prompt: "Suggest up to three short tags for this image. Return JSON with existing_tags (empty) and new_tags.",
        image_bytes: File.binread(SAMPLE), mime: "image/png",
        schema: Dam::Ai::AutoTaggingService::TAG_SCHEMA, max_tokens: 256
      )
      tags = Array(result.data["new_tags"]).first(3)
      Result.new(ok: true, message: "#{provider.name} (#{result.model}) suggested: #{tags.join(', ').presence || 'no tags'}")
    end
  end
end
