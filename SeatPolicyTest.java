package com.mango.bus.service;

import com.mango.bus.domain.SeatPolicy;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SeatPolicyTest {
    @Test
    void onlySeatNumbersOneThroughThirtySevenAreValid() {
        assertTrue(SeatPolicy.isValidSeatNumber(1));
        assertTrue(SeatPolicy.isValidSeatNumber(37));
        assertFalse(SeatPolicy.isValidSeatNumber(0));
        assertFalse(SeatPolicy.isValidSeatNumber(38));
    }

    @Test
    void seatCapacityIsABackendConstant() {
        assertEquals(37, SeatPolicy.TOTAL_SEATS);
        assertEquals(5, SeatPolicy.MAX_SEATS_PER_BOOKING);
    }

    @Test
    void seatTypesDifferBetweenSeaterAndSleeper() {
        assertEquals(com.mango.bus.domain.SeatType.SLEEPER,
                SeatPolicy.getSeatType(com.mango.bus.domain.BusCategory.AC_SLEEPER, 1));
        assertEquals(com.mango.bus.domain.SeatType.SLEEPER,
                SeatPolicy.getSeatType(com.mango.bus.domain.BusCategory.NON_AC_SLEEPER, 25));
        assertEquals(com.mango.bus.domain.SeatType.SEATER,
                SeatPolicy.getSeatType(com.mango.bus.domain.BusCategory.NON_AC_SEATER, 10));

        // Mixed semi-sleeper has lower deck seater (1-20) and upper deck sleeper berths (21-37)
        assertEquals(com.mango.bus.domain.SeatType.SEATER,
                SeatPolicy.getSeatType(com.mango.bus.domain.BusCategory.AC_SEATER_SEMI_SLEEPER, 5));
        assertEquals(com.mango.bus.domain.SeatType.SLEEPER,
                SeatPolicy.getSeatType(com.mango.bus.domain.BusCategory.AC_SEATER_SEMI_SLEEPER, 25));
    }

    @Test
    void availabilityUsesGreenAmberAndRedStates() {
        assertEquals("AVAILABLE", BusService.availability(SeatPolicy.TOTAL_SEATS));
        assertEquals("LIMITED", BusService.availability(6));
        assertEquals("LOW", BusService.availability(5));
        assertEquals("FULL", BusService.availability(0));
    }
}
