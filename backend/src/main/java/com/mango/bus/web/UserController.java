package com.mango.bus.web;

import com.mango.bus.dto.ApiDtos.BookingView;
import com.mango.bus.dto.ApiDtos.CreateBookingRequest;
import com.mango.bus.dto.ApiDtos.MessageResponse;
import com.mango.bus.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private final ReservationService reservations;

    public UserController(ReservationService reservations) {
        this.reservations = reservations;
    }

    @GetMapping("/bookings")
    public List<BookingView> myBookings(Authentication authentication) {
        return reservations.ownBookings(authentication.getName());
    }

    @PostMapping("/bookings")
    public List<BookingView> book(@Valid @RequestBody CreateBookingRequest request, Authentication authentication) {
        return reservations.book(authentication.getName(), request);
    }

    @PostMapping("/bookings/{bookingCode}/cancel")
    public BookingView cancel(@PathVariable String bookingCode, Authentication authentication) {
        return reservations.cancelOwn(bookingCode, authentication.getName());
    }

    @GetMapping("/ping")
    public MessageResponse ping() {
        return new MessageResponse("User workspace is ready.");
    }
}
