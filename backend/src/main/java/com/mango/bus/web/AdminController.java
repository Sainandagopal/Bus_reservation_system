package com.mango.bus.web;

import com.mango.bus.domain.ReservationStatus;
import com.mango.bus.domain.Role;
import com.mango.bus.dto.ApiDtos.*;
import com.mango.bus.repository.AppUserRepository;
import com.mango.bus.repository.BusRouteRepository;
import com.mango.bus.repository.ReservationRepository;
import com.mango.bus.service.BusService;
import com.mango.bus.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final BusService busService;
    private final ReservationService reservationService;
    private final BusRouteRepository buses;
    private final AppUserRepository users;
    private final ReservationRepository reservations;

    public AdminController(BusService busService, ReservationService reservationService,
                           BusRouteRepository buses, AppUserRepository users, ReservationRepository reservations) {
        this.busService = busService;
        this.reservationService = reservationService;
        this.buses = buses;
        this.users = users;
        this.reservations = reservations;
    }

    @GetMapping("/dashboard")
    public DashboardStats dashboard() {
        return new DashboardStats(buses.count(), buses.findAll().stream().filter(b -> b.isEnabled()).count(),
                users.countByRole(Role.USER), reservations.countByStatus(ReservationStatus.CONFIRMED),
                reservations.countByStatusAndJourneyDateGreaterThanEqual(ReservationStatus.CONFIRMED, LocalDate.now()));
    }

    @GetMapping("/buses")
    public List<BusView> listBuses(@RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate journeyDate) {
        return busService.allForAdmin(journeyDate);
    }

    @PostMapping("/buses")
    @ResponseStatus(HttpStatus.CREATED)
    public BusView createBus(@Valid @RequestBody BusRequest request) {
        return busService.create(request);
    }

    @PutMapping("/buses/{id}")
    public BusView updateBus(@PathVariable Long id, @Valid @RequestBody BusRequest request) {
        return busService.update(id, request);
    }

    @DeleteMapping("/buses/{id}")
    public MessageResponse deleteBus(@PathVariable Long id) {
        busService.delete(id);
        return new MessageResponse("Bus route deleted from active listings.");
    }

    @GetMapping("/bookings")
    public List<BookingView> allBookings() {
        return reservationService.allBookings();
    }

    @PostMapping("/bookings/{bookingCode}/cancel")
    public BookingView cancelBooking(@PathVariable String bookingCode) {
        return reservationService.cancelForAdmin(bookingCode);
    }
}
