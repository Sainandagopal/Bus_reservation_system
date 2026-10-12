package com.mango.bus.domain;

public enum SeatType {
    SEATER("Seater"),
    SLEEPER("Sleeper");

    private final String label;

    SeatType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
