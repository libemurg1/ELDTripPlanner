from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Trip, LogSheet, RouteStop
from .serializers import (
    TripSerializer,
    TripCreateSerializer,
    LogSheetSerializer,
    RouteStopSerializer,
    TripPlanRequestSerializer,
    TripPlanResponseSerializer,
    UserSerializer,
)
from .services import TripPlanningService


class TripListCreateView(generics.ListCreateAPIView):
    """
    List and create trips for the authenticated user
    """

    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TripCreateSerializer
        return TripSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific trip
    """

    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)


class LogSheetListView(generics.ListAPIView):
    """
    List log sheets for a specific trip
    """

    serializer_class = LogSheetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs["trip_id"]
        return LogSheet.objects.filter(
            trip__id=trip_id, trip__user=self.request.user
        ).order_by("date")


class RouteStopListView(generics.ListAPIView):
    """
    List route stops for a specific trip
    """

    serializer_class = RouteStopSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs["trip_id"]
        return RouteStop.objects.filter(
            trip__id=trip_id, trip__user=self.request.user
        ).order_by("sequence_order")


@extend_schema(
    request=TripPlanRequestSerializer,
    responses={201: TripPlanResponseSerializer},
    description="Plan a complete trip with route calculation and ELD log generation",
)
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def plan_trip(request):
    """
    Plan a complete trip with route calculation and ELD logs
    """
    serializer = TripPlanRequestSerializer(data=request.data)
    if serializer.is_valid():
        try:
            planning_service = TripPlanningService()
            trip = planning_service.plan_trip(
                current_location=serializer.validated_data["current_location"],
                pickup_location=serializer.validated_data["pickup_location"],
                dropoff_location=serializer.validated_data["dropoff_location"],
                current_cycle_hours=float(
                    serializer.validated_data["current_cycle_hours"]
                ),
                user=request.user,
            )

            # Return the complete trip with route stops and log sheets
            response_serializer = TripPlanResponseSerializer(trip)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Trip planning failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses={200: UserSerializer},
    description="Register a new user account",
)
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    """
    Register a new user
    """
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email", "")
    first_name = request.data.get("first_name", "")
    last_name = request.data.get("last_name", "")

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "user": UserSerializer(user).data,
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
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
def login(request):
    """
    Login user and return JWT tokens
    """
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )
    else:
        return Response(
            {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
        )


@extend_schema(
    responses={200: OpenApiTypes.OBJECT}, description="Get current user profile"
)
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def profile(request):
    """
    Get current user profile
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
