from io import BytesIO

from django.contrib.auth.models import User
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import LogSheet, RouteStop, Trip
from .serializers import (
    LogSheetSerializer,
    RouteStopSerializer,
    TripCreateSerializer,
    TripPlanRequestSerializer,
    TripPlanResponseSerializer,
    TripSerializer,
)
from .services import TripPlanningService

# PDF generation imports
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
from .services import TripPlanningService


# Create Retrieve Update Delete (CRUD) Views for Trips
# ===============================================================================
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


# ===============================================================================
class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific trip
    """

    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)


# Log Sheets and Route Stops List Views
# ===============================================================================
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


# ===============================================================================
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


# Trip Planning View
# ===============================================================================
#  Plan a complete trip with route calculation and ELD log generation
# ===============================================================================
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

    # Validate input data
    serializer = TripPlanRequestSerializer(data=request.data)
    if serializer.is_valid():
        try:
            # Use the TripPlanningService to plan the trip
            planning_service = TripPlanningService()

            # Plan the trip
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

            # Return response
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Trip planning failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


# download ELD log sheets as PDF
# ===============================================================================
# check if reportlab is available
# ===============================================================================
@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiTypes.BINARY},
    description="Download ELD log sheets as PDF",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def download_eld_logs(request):
    """
    Download ELD log sheets as PDF
    """
    if not REPORTLAB_AVAILABLE:
        return Response(
            {"error": "PDF generation not available on this server"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Get trip ID from request
    trip_id = request.data.get("trip_id")
    if not trip_id:
        return Response(
            {"error": "Trip ID is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        trip = Trip.objects.get(id=trip_id)
        # Get log sheets for the trip
        log_sheets = LogSheet.objects.filter(trip=trip).order_by("date")

        if not log_sheets.exists():
            return Response(
                {"error": "No log sheets found for this trip"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        # Build PDF content
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = styles["Heading1"]
        story.append(Paragraph(f"ELD Log Sheets - Trip #{trip.id}", title_style))
        story.append(Spacer(1, 12))

        # Trip info
        normal_style = styles["Normal"]
        trip_info = [
            ["Current Location:", trip.current_location],
            ["Pickup Location:", trip.pickup_location],
            ["Dropoff Location:", trip.dropoff_location],
            ["Total Distance:", f"{trip.total_distance or 'N/A'} miles"],
            ["Status:", trip.status],
        ]

        for label, value in trip_info:
            story.append(Paragraph(f"{label} {value}", normal_style))

        story.append(Spacer(1, 12))

        # Log sheets
        for log_sheet in log_sheets:
            story.append(Paragraph(f"Date: {log_sheet.date}", styles["Heading2"]))
            story.append(Paragraph(f"Driver Hours Summary:", normal_style))

            # Hours table
            hours_data = [
                ["Category", "Hours"],
                ["Driving", str(log_sheet.driving_hours)],
                ["On Duty (Not Driving)", str(log_sheet.on_duty_hours)],
                ["Off Duty", str(log_sheet.off_duty_hours)],
                ["Sleeper Berth", str(log_sheet.sleeper_berth_hours)],
                ["Cycle Used", str(log_sheet.cycle_hours_used)],
            ]

            hours_table = Table(hours_data)
            hours_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, -1), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 14),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 1), (-1, -1), 12),
                        ("BOTTOMPADDING", (0, 1), (-1, -1), 12),
                    ]
                )
            )

            story.append(hours_table)
            story.append(Spacer(1, 12))

        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="eld_logs_trip_{trip_id}.pdf"'
        )
        return response

    except Trip.DoesNotExist:
        return Response(
            {"error": "Trip not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiTypes.BINARY},
    description="Generate Hours of Service report as PDF",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_hos_report(request):
    """
    Generate Hours of Service report as PDF
    """
    if not REPORTLAB_AVAILABLE:
        return Response(
            {"error": "PDF generation not available on this server"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    trip_id = request.data.get("trip_id")
    if not trip_id:
        return Response(
            {"error": "Trip ID is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        trip = Trip.objects.get(id=trip_id)
        log_sheets = LogSheet.objects.filter(trip=trip).order_by("date")

        if not log_sheets.exists():
            return Response(
                {"error": "No log sheets found for this trip"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = styles["Heading1"]
        story.append(Paragraph("Hours of Service Report", title_style))
        story.append(Paragraph(f"Trip #{trip.id}", title_style))
        story.append(Spacer(1, 12))

        # Trip info
        normal_style = styles["Normal"]
        trip_info = [
            ["Current Location:", trip.current_location],
            ["Pickup Location:", trip.pickup_location],
            ["Dropoff Location:", trip.dropoff_location],
            ["Total Distance:", f"{trip.total_distance or 'N/A'} miles"],
            ["Status:", trip.status],
            ["Initial Cycle Hours:", f"{trip.current_cycle_hours} hours"],
        ]

        for label, value in trip_info:
            story.append(Paragraph(f"{label} {value}", normal_style))

        story.append(Spacer(1, 12))

        # Daily summaries
        story.append(Paragraph("Daily Hours Summary", styles["Heading2"]))

        daily_data = [
            ["Date", "Driving", "On Duty", "Off Duty", "Sleeper", "Cycle Used"]
        ]

        for log_sheet in log_sheets:
            daily_data.append(
                [
                    log_sheet.date,
                    str(log_sheet.driving_hours),
                    str(log_sheet.on_duty_hours),
                    str(log_sheet.off_duty_hours),
                    str(log_sheet.sleeper_berth_hours),
                    str(log_sheet.cycle_hours_used),
                ]
            )

        hos_table = Table(daily_data)
        hos_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                    ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                ]
            )
        )

        story.append(hos_table)
        story.append(Spacer(1, 12))

        # HOS Compliance summary
        total_driving = sum(log.driving_hours for log in log_sheets)
        total_on_duty = sum(log.on_duty_hours for log in log_sheets)

        story.append(Paragraph("HOS Compliance Summary", styles["Heading2"]))
        compliance_data = [
            ["Metric", "Value", "Status"],
            [
                "Total Driving Hours",
                f"{total_driving:.1f}",
                "COMPLIANT" if total_driving <= 70 else "EXCEEDED",
            ],
            ["Total On-Duty Hours", f"{total_on_duty:.1f}", "COMPLIANT"],
            ["Cycle Remaining", f"{70 - trip.current_cycle_hours:.1f} hours", "OK"],
        ]

        compliance_table = Table(compliance_data)
        compliance_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    (
                        "BACKGROUND",
                        (0, 2),
                        (-1, -1),
                        (
                            colors.green
                            if "COMPLIANT" in str(compliance_data[1][2])
                            else colors.red
                        ),
                    ),
                    ("TEXTCOLOR", (0, 2), (-1, -1), colors.whitesmoke),
                    ("ALIGN", (0, 2), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 2), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 2), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 2), (-1, -1), 8),
                ]
            )
        )

        story.append(compliance_table)
        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="hos_report_trip_{trip_id}.pdf"'
        )
        return response

    except Trip.DoesNotExist:
        return Response(
            {"error": "Trip not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
