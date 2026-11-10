package com.mango.bus.domain;

/** Central backend-only seat-capacity rule. Do not expose this as an editable bus field. */
public final class SeatPolicy {
    public static final int TOTAL_SEATS = 37;
    public static final int LOW_AVAILABILITY_THRESHOLD = 5;
    public static final int MAX_SEATS_PER_BOOKING = 5;

    private SeatPolicy() {
    }

    public static boolean isValidSeatNumber(int seatNumber) {
        return seatNumber >= 1 && seatNumber <= TOTAL_SEATS;
    }

    public static SeatType getSeatType(BusCategory category, int seatNumber) {
        if (category == null) {
            return SeatType.SEATER;
        }
        if (category == BusCategory.AC_SLEEPER || category == BusCategory.NON_AC_SLEEPER) {
            return SeatType.SLEEPER;
        }
        if (category == BusCategory.NON_AC_SEATER) {
            return SeatType.SEATER;
        }
        // Hybrid AC Seater / Semi-Sleeper: Lower deck 1-20 Seater, Upper deck 21-37 Sleeper berths
        return seatNumber <= 20 ? SeatType.SEATER : SeatType.SLEEPER;
    }

    public static String getDeck(BusCategory category, int seatNumber) {
        if (category == null || category == BusCategory.NON_AC_SEATER) {
            return "MAIN";
        }
        if (category == BusCategory.AC_SEATER_SEMI_SLEEPER) {
            return seatNumber <= 20 ? "LOWER" : "UPPER";
        }
        return seatNumber <= 18 ? "LOWER" : "UPPER";
    }
}
