# The organization that owns this install. There is exactly one (created by /setup);
# it is the DAM's tenant.
class Organization < ApplicationRecord
  LOCALES = %w[en es fr de pt it].freeze
  MAX_LOGO_SIZE = 2.megabytes
  LOGO_TYPES = %w[image/png image/jpeg image/webp image/svg+xml].freeze

  has_many :users, dependent: :restrict_with_exception
  has_one_attached :logo

  validates :name, presence: true, length: { maximum: 120 }
  validates :default_locale, inclusion: { in: LOCALES }
  validates :retention_days, numericality: { only_integer: true, in: 1..3650 }
  validate :only_one_organization, on: :create
  validate :logo_is_a_small_image

  def self.current = first

  def owner = users.find_by(role: "owner")

  private

  def only_one_organization
    errors.add(:base, "An organization already exists") if Organization.exists?
  end

  def logo_is_a_small_image
    return unless logo.attached?

    errors.add(:logo, "must be a PNG, JPEG, WebP or SVG image") unless logo.blob.content_type.in?(LOGO_TYPES)
    errors.add(:logo, "must be smaller than 2 MB") if logo.blob.byte_size > MAX_LOGO_SIZE
  end
end
