from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from . import views

app_name = "authentication"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.profile_view, name="profile"),
    path("profile/update/", views.update_profile_view, name="update_profile"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
