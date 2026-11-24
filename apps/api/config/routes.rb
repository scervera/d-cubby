Rails.application.routes.draw do
  # GET /health is answered by HealthMiddleware (config/initializers/health_middleware.rb).

  scope "api/v1", module: "api/v1", as: "api_v1" do
    get "config", to: "config#show"

    get "setup", to: "setup#show"
    post "setup", to: "setup#create"

    post "auth/login", to: "auth#login"
    delete "auth/logout", to: "auth#logout"
    post "auth/password/forgot", to: "auth#forgot_password"
    post "auth/password/reset", to: "auth#reset_password"
    post "auth/invitation/accept", to: "auth#accept_invitation"

    get "users/me", to: "users#me"
    patch "users/me", to: "users#update_me"
    resources :users, only: %i[index create update] do
      post :reset_password, on: :member
    end

    resource :organization, only: %i[show update]
    get "dashboard/stats", to: "dashboard#stats"

    get "system/status", to: "system#status"
    post "system/checks/:name", to: "system#check", as: :system_check
  end

  # The DAM API (assets, tags, smart folders, drop zones, groups, ...).
  scope "api/v1" do
    mount Dam::Engine, at: "/"
  end
end
