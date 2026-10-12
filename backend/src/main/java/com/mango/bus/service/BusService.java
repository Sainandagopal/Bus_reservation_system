package com.mango.bus.service;

import com.mango.bus.domain.BusCategory;
import com.mango.bus.domain.BusRoute;
import com.mango.bus.domain.ReservationStatus;
import com.mango.bus.domain.SeatPolicy;
import com.mango.bus.domain.SeatType;
import com.mango.bus.dto.ApiDtos.BusRequest;
import com.mango.bus.dto.ApiDtos.BusView;
import com.mango.bus.dto.ApiDtos.SeatMapView;
import com.mango.bus.dto.ApiDtos.SeatView;
import com.mango.bus.repository.BusRouteRepository;
import com.mango.bus.repository.ReservationRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class BusService {
    private final BusRouteRepository buses;
    private final ReservationRepository reservations;

    public BusService(BusRouteRepository buses, ReservationRepository reservations) {
        this.buses = buses;
        this.reservations = reservations;
    }

    @Transactional(readOnly = true)
    public List<BusView> search(String source, String destination, LocalDate date, BusCategory category) {
        LocalDate journeyDate = date == null ? LocalDate.now().plusDays(1) : date;
        String sourceFilter = normalizeFilter(source);
        String destinationFilter = normalizeFilter(destination);
        return buses.findAll().stream()
                .filter(BusRoute::isEnabled)
                .filter(bus -> sourceFilter.isEmpty() || contains(bus.getSource(), sourceFilter))
                .filter(bus -> destinationFilter.isEmpty() || contains(bus.getDestination(), destinationFilter))
                .filter(bus -> category == null || bus.getCategory() == category)
                .sorted(Comparator.comparing(BusRoute::getDepartureTime).thenComparing(BusRoute::getName))
                .map(bus -> view(bus, journeyDate))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BusView> allForAdmin(LocalDate date) {
        LocalDate journeyDate = date == null ? LocalDate.now().plusDays(1) : date;
        return buses.findAll().stream()
                .sorted(Comparator.comparing(BusRoute::getId))
                .map(bus -> view(bus, journeyDate))
                .toList();
    }

    @Transactional(readOnly = true)
    public SeatMapView seatMap(Long busId, LocalDate date) {
        LocalDate journeyDate = date == null ? LocalDate.now().plusDays(1) : date;
        BusRoute bus = buses.findById(busId).orElseThrow(() -> new EntityNotFoundException("Bus route was not found."));
        if (!bus.isEnabled()) throw new IllegalArgumentException("This bus route is no longer available.");
        var occupied = reservations.findByBusIdAndJourneyDateAndStatus(busId, journeyDate, ReservationStatus.CONFIRMED)
                .stream().map(r -> r.getSeatNumber()).collect(java.util.stream.Collectors.toSet());
        List<SeatView> seats = new ArrayList<>(SeatPolicy.TOTAL_SEATS);
        for (int number = 1; number <= SeatPolicy.TOTAL_SEATS; number++) {
            SeatType seatType = SeatPolicy.getSeatType(bus.getCategory(), number);
            String deck = SeatPolicy.getDeck(bus.getCategory(), number);
            seats.add(new SeatView(number, occupied.contains(number) ? "BOOKED" : "AVAILABLE", seatType, deck));
        }
        int available = SeatPolicy.TOTAL_SEATS - occupied.size();
        return new SeatMapView(bus.getId(), journeyDate, seats, available, availability(available));
    }

    @Transactional
    public BusView create(BusRequest request) {
        validateRequest(request);
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (buses.existsByCodeIgnoreCase(code)) throw new IllegalArgumentException("A bus with this bus code already exists.");
        BusRoute bus = new BusRoute(request.name().trim(), code, request.source().trim(), request.destination().trim(),
                request.departureTime(), request.arrivalTime(), request.category(), request.fare(),
                request.enabled() == null || request.enabled());
        return view(buses.save(bus), LocalDate.now().plusDays(1));
    }

    @Transactional
    public BusView update(Long id, BusRequest request) {
        validateRequest(request);
        BusRoute bus = buses.findById(id).orElseThrow(() -> new EntityNotFoundException("Bus route was not found."));
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        boolean conflict = buses.findAll().stream().anyMatch(other -> !other.getId().equals(id) && other.getCode().equalsIgnoreCase(code));
        if (conflict) throw new IllegalArgumentException("Another bus is already using this bus code.");
        bus.update(request.name().trim(), code, request.source().trim(), request.destination().trim(),
                request.departureTime(), request.arrivalTime(), request.category(), request.fare(),
                request.enabled() == null ? bus.isEnabled() : request.enabled());
        return view(bus, LocalDate.now().plusDays(1));
    }

    @Transactional
    public void delete(Long id) {
        BusRoute bus = buses.findById(id).orElseThrow(() -> new EntityNotFoundException("Bus route was not found."));
        boolean upcomingConfirmed = reservations.existsByBusIdAndStatusAndJourneyDateGreaterThanEqual(
                id, ReservationStatus.CONFIRMED, LocalDate.now());
        if (upcomingConfirmed) {
            throw new IllegalArgumentException("This route has confirmed upcoming bookings. Cancel those bookings before deleting the route.");
        }
        bus.deactivate(); // Soft-delete to preserve historical ticket references.
    }

    @Transactional(readOnly = true)
    public BusView view(BusRoute bus, LocalDate journeyDate) {
        int occupied = reservations.findByBusIdAndJourneyDateAndStatus(bus.getId(), journeyDate, ReservationStatus.CONFIRMED)
                .size();
        int available = Math.max(0, SeatPolicy.TOTAL_SEATS - occupied);
        return new BusView(bus.getId(), bus.getName(), bus.getCode(), bus.getSource(), bus.getDestination(),
                bus.getDepartureTime(), bus.getArrivalTime(), bus.getCategory(), bus.getCategory().getLabel(),
                bus.getFare(), available, availability(available), bus.isEnabled());
    }

    public static String availability(int availableSeats) {
        if (availableSeats == 0) return "FULL";
        if (availableSeats <= SeatPolicy.LOW_AVAILABILITY_THRESHOLD) return "LOW";
        if (availableSeats == SeatPolicy.TOTAL_SEATS) return "AVAILABLE";
        return "LIMITED";
    }

    private void validateRequest(BusRequest request) {
        if (request.source().trim().equalsIgnoreCase(request.destination().trim())) {
            throw new IllegalArgumentException("Source and destination must be different.");
        }
        if (request.fare().signum() <= 0) throw new IllegalArgumentException("Fare must be greater than zero.");
    }

    private static String normalizeFilter(String value) {
        return value == null ? "" : value.trim();
    }

    private static boolean contains(String value, String filter) {
        return value.toLowerCase(Locale.ROOT).contains(filter.toLowerCase(Locale.ROOT));
    }
}
