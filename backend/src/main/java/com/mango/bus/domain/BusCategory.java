package com.mango.bus.domain;

public enum BusCategory {
    AC_SLEEPER("AC Sleeper"),
    AC_SEATER_SEMI_SLEEPER("AC Seater (Semi-Sleeper)"),
    NON_AC_SLEEPER("Non-AC Sleeper"),
    NON_AC_SEATER("Non-AC Seater");

    private final String label;

    BusCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
