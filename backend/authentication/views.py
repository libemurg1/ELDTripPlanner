from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import HttpRequest, HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserRegistrationSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiTypes.OBJECT},
    description="Authenticate user and return JWT tokens",
)
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request: HttpRequest) -> HttpResponse:
    """
    Login user and return JWT tokens
    """
    username = request.data.get("username") or request.data.get("email")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username/email and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )
    else:
        return Response(
            {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
        )


@extend_schema(responses={200: UserSerializer}, description="Get current user profile")
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request):
    """
    Get current user profile
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@extend_schema(
    request=UserSerializer,
    responses={200: UserSerializer},
    description="Update user profile",
)
@api_view(["PUT"])
@permission_classes([permissions.IsAuthenticated])
def update_profile_view(request):
    """
    Update user profile
    """
    user = request.user
    serializer = UserSerializer(user, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: OpenApiTypes.OBJECT},
    description="Logout user",
)
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request: HttpRequest) -> HttpResponse:
    """
    Logout user
    """
    try:
        # If token blacklisting is available, blacklist the refresh token
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except AttributeError:
                # Blacklisting not available, just continue
                pass
            except Exception:
                # Invalid token, continue
                pass

        return Response(
            {"message": "Successfully logged out"}, status=status.HTTP_200_OK
        )
    except Exception:
        return Response(
            {"message": "Successfully logged out"}, status=status.HTTP_200_OK
        )
