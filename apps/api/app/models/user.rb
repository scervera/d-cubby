# A person who can sign in. Implements the user contract of the dam gem: admin?,
# tenant_owner?, dam_writer?, disabled?, tenant, and the DAM associations.
class User < ApplicationRecord
  # Highest first. owner: one per install, everything; admin: users and settings;
  # editor: upload and organize assets; viewer: browse and download.
  ROLES = %w[owner admin editor viewer].freeze
  MIN_PASSWORD_LENGTH = 10

  has_secure_password

  belongs_to :organization

  has_many :assets, class_name: "Dam::Asset", dependent: :restrict_with_exception
  has_many :collections, class_name: "Dam::Collection", dependent: :destroy
  has_many :smart_folders, class_name: "Dam::SmartFolder", dependent: :destroy
  has_many :owned_groups, class_name: "Dam::Group", foreign_key: :owner_id, dependent: :destroy
  has_many :owned_drop_zones, class_name: "Dam::DropZone", foreign_key: :owner_id, dependent: :destroy
  has_many :drop_zone_subscriptions, class_name: "Dam::DropZoneSubscription", dependent: :destroy
  has_many :subscribed_drop_zones, through: :drop_zone_subscriptions, source: :drop_zone

  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :name, presence: true, length: { maximum: 120 }
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, inclusion: { in: ROLES }
  validates :password, length: { minimum: MIN_PASSWORD_LENGTH }, allow_nil: true
  validates :locale, inclusion: { in: Organization::LOCALES }, allow_nil: true

  before_save :revoke_tokens, if: -> { will_save_change_to_password_digest? || will_save_change_to_disabled_at? }

  # Reset links stop working once the password changes.
  generates_token_for :password_reset, expires_in: 1.hour do
    password_salt.last(10)
  end
  # Invitation links (set your first password) last longer.
  generates_token_for :invitation, expires_in: 7.days do
    password_salt.last(10)
  end

  scope :active, -> { where(disabled_at: nil) }

  def tenant = organization

  def owner? = role == "owner"
  def admin?(*) = role.in?(%w[owner admin])
  def tenant_owner?(*) = owner?
  def dam_writer?(*) = role.in?(%w[owner admin editor])
  def disabled? = disabled_at.present?

  def disable! = update!(disabled_at: Time.current)
  def enable! = update!(disabled_at: nil)

  # Roles this user may give to others. Nobody grants owner through the API, and only
  # the owner grants admin (admins can't manage other admins).
  def assignable_roles
    if owner? then %w[admin editor viewer]
    elsif admin? then %w[editor viewer]
    else []
    end
  end

  # Whether this user may change or disable `other`.
  def can_manage?(other)
    return false unless admin?
    return false if other == self || other.owner?

    owner? || other.role != "admin"
  end

  private

  def revoke_tokens
    self.token_version += 1 unless new_record?
  end
end
