-- ============================================================
-- EVCHARGE DATABASE
-- EV Charging Demand, Utilization, Congestion & Recommendation
-- MySQL 8.x
-- ============================================================


-- ============================================================
-- 1. DATABASE
-- ============================================================

DROP DATABASE IF EXISTS evcharge_db;

CREATE DATABASE evcharge_db;

USE evcharge_db;


-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_users
        PRIMARY KEY (user_id),

    CONSTRAINT uq_users_email
        UNIQUE (email),

    CONSTRAINT chk_user_role
        CHECK (role IN ('CUSTOMER', 'ADMIN', 'OPERATOR')),

    CONSTRAINT chk_user_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);


-- ============================================================
-- 3. VEHICLE MODEL
-- ============================================================

CREATE TABLE vehicle_model (
    model_id INT AUTO_INCREMENT,

    manufacturer VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,

    battery_capacity_kwh DECIMAL(10,2) NOT NULL,
    connector_type VARCHAR(50) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicle_model
        PRIMARY KEY (model_id),

    CONSTRAINT uq_vehicle_model
        UNIQUE (manufacturer, model_name),

    CONSTRAINT chk_model_battery
        CHECK (battery_capacity_kwh > 0)
);


-- ============================================================
-- 4. VEHICLE
-- ============================================================

CREATE TABLE vehicle (
    vehicle_id INT AUTO_INCREMENT,

    user_id INT NOT NULL,
    model_id INT NOT NULL,

    registration_no VARCHAR(50) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicle
        PRIMARY KEY (vehicle_id),

    CONSTRAINT fk_vehicle_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_vehicle_model
        FOREIGN KEY (model_id)
        REFERENCES vehicle_model(model_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_vehicle_registration
        UNIQUE (registration_no)
);


-- ============================================================
-- 5. CHARGING STATION
-- ============================================================

CREATE TABLE charging_station (
    station_id INT AUTO_INCREMENT,

    station_name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,

    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,

    operator VARCHAR(100),

    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_charging_station
        PRIMARY KEY (station_id),

    CONSTRAINT chk_latitude
        CHECK (latitude BETWEEN -90 AND 90),

    CONSTRAINT chk_longitude
        CHECK (longitude BETWEEN -180 AND 180),

    CONSTRAINT chk_station_hours
        CHECK (closing_time > opening_time),

    CONSTRAINT chk_station_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'MAINTENANCE'
            )
        )
);


-- ============================================================
-- 6. CHARGER
-- ============================================================

CREATE TABLE charger (
    charger_id INT AUTO_INCREMENT,

    station_id INT NOT NULL,

    connector_type VARCHAR(50) NOT NULL,
    power_kw DECIMAL(10,2) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_charger
        PRIMARY KEY (charger_id),

    CONSTRAINT fk_charger_station
        FOREIGN KEY (station_id)
        REFERENCES charging_station(station_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_charger_power
        CHECK (power_kw > 0),

    CONSTRAINT chk_charger_status
        CHECK (
            status IN (
                'AVAILABLE',
                'OCCUPIED',
                'OUT_OF_SERVICE',
                'MAINTENANCE'
            )
        )
);


-- ============================================================
-- 7. BOOKING
-- ============================================================

CREATE TABLE booking (
    booking_id INT AUTO_INCREMENT,

    user_id INT NOT NULL,
    charger_id INT NOT NULL,

    booking_start DATETIME NOT NULL,
    booking_end DATETIME NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_booking
        PRIMARY KEY (booking_id),

    CONSTRAINT fk_booking_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_booking_charger
        FOREIGN KEY (charger_id)
        REFERENCES charger(charger_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_booking_time
        CHECK (booking_end > booking_start),

    CONSTRAINT chk_booking_status
        CHECK (
            status IN (
                'PENDING',
                'CONFIRMED',
                'COMPLETED',
                'CANCELLED'
            )
        )
);


-- ============================================================
-- 8. CHARGING SESSION
-- ============================================================

CREATE TABLE charging_session (
    session_id INT AUTO_INCREMENT,

    vehicle_id INT NOT NULL,
    charger_id INT NOT NULL,

    start_time DATETIME NOT NULL,
    end_time DATETIME,

    energy_delivered_kwh DECIMAL(10,2) NOT NULL DEFAULT 0,

    wait_time_minutes INT NOT NULL DEFAULT 0,

    session_status VARCHAR(20) NOT NULL DEFAULT 'ONGOING',

    cost DECIMAL(10,2) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_charging_session
        PRIMARY KEY (session_id),

    CONSTRAINT fk_session_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicle(vehicle_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_session_charger
        FOREIGN KEY (charger_id)
        REFERENCES charger(charger_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_session_time
        CHECK (
            end_time IS NULL
            OR end_time >= start_time
        ),

    CONSTRAINT chk_energy
        CHECK (energy_delivered_kwh >= 0),

    CONSTRAINT chk_wait_time
        CHECK (wait_time_minutes >= 0),

    CONSTRAINT chk_cost
        CHECK (cost >= 0),

    CONSTRAINT chk_session_status
        CHECK (
            session_status IN (
                'ONGOING',
                'COMPLETED',
                'CANCELLED'
            )
        )
);


-- ============================================================
-- 9. PAYMENT
-- ============================================================

CREATE TABLE payment (
    payment_id INT AUTO_INCREMENT,

    session_id INT NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    payment_method VARCHAR(50) NOT NULL,

    transaction_time DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT pk_payment
        PRIMARY KEY (payment_id),

    CONSTRAINT fk_payment_session
        FOREIGN KEY (session_id)
        REFERENCES charging_session(session_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_payment_session
        UNIQUE (session_id),

    CONSTRAINT chk_payment_amount
        CHECK (amount >= 0),

    CONSTRAINT chk_payment_status
        CHECK (
            payment_status IN (
                'PENDING',
                'SUCCESS',
                'FAILED',
                'REFUNDED'
            )
        )
);


-- ============================================================
-- 10. MAINTENANCE RECORD
-- ============================================================

CREATE TABLE maintenance_record (
    maintenance_id INT AUTO_INCREMENT,

    charger_id INT NOT NULL,

    start_time DATETIME NOT NULL,
    end_time DATETIME,

    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_maintenance
        PRIMARY KEY (maintenance_id),

    CONSTRAINT fk_maintenance_charger
        FOREIGN KEY (charger_id)
        REFERENCES charger(charger_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_maintenance_time
        CHECK (
            end_time IS NULL
            OR end_time >= start_time
        ),

    CONSTRAINT chk_maintenance_status
        CHECK (
            status IN (
                'SCHEDULED',
                'ONGOING',
                'COMPLETED',
                'CANCELLED'
            )
        )
);


-- ============================================================
-- 11. FAVORITE STATION
-- ============================================================

CREATE TABLE favorite_station (
    favorite_id INT AUTO_INCREMENT,

    user_id INT NOT NULL,
    station_id INT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_favorite_station
        PRIMARY KEY (favorite_id),

    CONSTRAINT fk_favorite_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorite_station
        FOREIGN KEY (station_id)
        REFERENCES charging_station(station_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_user_favorite
        UNIQUE (user_id, station_id)
);


-- ============================================================
-- 12. STATION RATING
-- ============================================================

CREATE TABLE station_rating (
    rating_id INT AUTO_INCREMENT,

    user_id INT NOT NULL,
    station_id INT NOT NULL,

    rating INT NOT NULL,

    review TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_station_rating
        PRIMARY KEY (rating_id),

    CONSTRAINT fk_rating_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rating_station
        FOREIGN KEY (station_id)
        REFERENCES charging_station(station_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_rating
        CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT uq_user_station_rating
        UNIQUE (user_id, station_id)
);


-- ============================================================
-- 13. STATION SNAPSHOT
-- ============================================================

CREATE TABLE station_snapshot (
    snapshot_id INT AUTO_INCREMENT,

    station_id INT NOT NULL,

    snapshot_time DATETIME NOT NULL,

    available_count INT NOT NULL,
    occupied_count INT NOT NULL,

    avg_wait_time DECIMAL(10,2) NOT NULL,

    utilization_rate DECIMAL(5,2) NOT NULL,

    queue_length INT NOT NULL,

    CONSTRAINT pk_station_snapshot
        PRIMARY KEY (snapshot_id),

    CONSTRAINT fk_snapshot_station
        FOREIGN KEY (station_id)
        REFERENCES charging_station(station_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_available_count
        CHECK (available_count >= 0),

    CONSTRAINT chk_occupied_count
        CHECK (occupied_count >= 0),

    CONSTRAINT chk_avg_wait
        CHECK (avg_wait_time >= 0),

    CONSTRAINT chk_utilization
        CHECK (utilization_rate BETWEEN 0 AND 100),

    CONSTRAINT chk_queue_length
        CHECK (queue_length >= 0)
);


-- ============================================================
-- 14. DEMAND FORECAST
-- ============================================================

CREATE TABLE demand_forecast (
    forecast_id INT AUTO_INCREMENT,

    station_id INT NOT NULL,

    forecast_time DATETIME NOT NULL,

    predicted_demand DECIMAL(10,2) NOT NULL,

    predicted_queue DECIMAL(10,2) NOT NULL,

    predicted_wait DECIMAL(10,2) NOT NULL,

    confidence_score DECIMAL(5,2) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_demand_forecast
        PRIMARY KEY (forecast_id),

    CONSTRAINT fk_forecast_station
        FOREIGN KEY (station_id)
        REFERENCES charging_station(station_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_predicted_demand
        CHECK (predicted_demand >= 0),

    CONSTRAINT chk_predicted_queue
        CHECK (predicted_queue >= 0),

    CONSTRAINT chk_predicted_wait
        CHECK (predicted_wait >= 0),

    CONSTRAINT chk_confidence
        CHECK (confidence_score BETWEEN 0 AND 1)
);


-- ============================================================
-- 15. PRICING PLAN
-- ============================================================

CREATE TABLE pricing_plan (
    pricing_id INT AUTO_INCREMENT,

    station_id INT NOT NULL,

    price_per_kwh DECIMAL(10,2) NOT NULL,

    off_peak_price DECIMAL(10,2),
    peak_price DECIMAL(10,2),

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_pricing_plan
        PRIMARY KEY (pricing_id),

    CONSTRAINT fk_pricing_station
        FOREIGN KEY (station_id)
        REFERENCES charging_station(station_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_price
        CHECK (price_per_kwh >= 0),

    CONSTRAINT chk_off_peak_price
        CHECK (
            off_peak_price IS NULL
            OR off_peak_price >= 0
        ),

    CONSTRAINT chk_peak_price
        CHECK (
            peak_price IS NULL
            OR peak_price >= 0
        ),

    CONSTRAINT chk_pricing_time
        CHECK (end_time > start_time)
);


-- ============================================================
-- 16. INDEXES
-- ============================================================

CREATE INDEX idx_vehicle_user
ON vehicle(user_id);

CREATE INDEX idx_vehicle_model
ON vehicle(model_id);

CREATE INDEX idx_charger_station
ON charger(station_id);

CREATE INDEX idx_charger_connector
ON charger(connector_type);

CREATE INDEX idx_charger_status
ON charger(status);

CREATE INDEX idx_booking_user
ON booking(user_id);

CREATE INDEX idx_booking_charger
ON booking(charger_id);

CREATE INDEX idx_booking_time
ON booking(booking_start, booking_end);

CREATE INDEX idx_session_vehicle
ON charging_session(vehicle_id);

CREATE INDEX idx_session_charger
ON charging_session(charger_id);

CREATE INDEX idx_session_time
ON charging_session(start_time);

CREATE INDEX idx_snapshot_station_time
ON station_snapshot(station_id, snapshot_time);

CREATE INDEX idx_forecast_station_time
ON demand_forecast(station_id, forecast_time);

CREATE INDEX idx_maintenance_charger
ON maintenance_record(charger_id);

CREATE INDEX idx_rating_station
ON station_rating(station_id);

CREATE INDEX idx_pricing_station_time
ON pricing_plan(station_id, start_time, end_time);


-- ============================================================
-- 17. TRIGGER - PREVENT OVERLAPPING BOOKINGS
-- ============================================================

DELIMITER $$

CREATE TRIGGER trg_prevent_booking_overlap
BEFORE INSERT ON booking
FOR EACH ROW
BEGIN

    IF NEW.status IN ('PENDING', 'CONFIRMED') THEN

        IF EXISTS (
            SELECT 1
            FROM booking b
            WHERE b.charger_id = NEW.charger_id
              AND b.status IN ('PENDING', 'CONFIRMED')
              AND NEW.booking_start < b.booking_end
              AND NEW.booking_end > b.booking_start
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
            'Charger already has an overlapping booking';

        END IF;

    END IF;

END$$

DELIMITER ;


-- ============================================================
-- 18. TRIGGER - PREVENT OVERLAPPING BOOKING ON UPDATE
-- ============================================================

DELIMITER $$

CREATE TRIGGER trg_prevent_booking_overlap_update
BEFORE UPDATE ON booking
FOR EACH ROW
BEGIN

    IF NEW.status IN ('PENDING', 'CONFIRMED') THEN

        IF EXISTS (
            SELECT 1
            FROM booking b
            WHERE b.charger_id = NEW.charger_id
              AND b.booking_id <> NEW.booking_id
              AND b.status IN ('PENDING', 'CONFIRMED')
              AND NEW.booking_start < b.booking_end
              AND NEW.booking_end > b.booking_start
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
            'Charger already has an overlapping booking';

        END IF;

    END IF;

END$$

DELIMITER ;


-- ============================================================
-- 19. VIEW - STATION CONGESTION
-- ============================================================

CREATE VIEW station_congestion_view AS
SELECT
    cs.station_id,
    cs.station_name,

    ss.snapshot_time,

    ss.available_count,
    ss.occupied_count,

    ss.queue_length,
    ss.avg_wait_time,

    ss.utilization_rate,

    CASE

        WHEN ss.utilization_rate >= 80
             OR ss.queue_length >= 5
             OR ss.avg_wait_time >= 20
        THEN 'HIGH'

        WHEN ss.utilization_rate >= 50
             OR ss.queue_length >= 3
             OR ss.avg_wait_time >= 10
        THEN 'MEDIUM'

        ELSE 'LOW'

    END AS congestion_level

FROM charging_station cs

JOIN station_snapshot ss
    ON cs.station_id = ss.station_id;


-- ============================================================
-- 20. VIEW - STATION UTILIZATION
-- ============================================================

CREATE VIEW station_utilization_view AS
SELECT

    cs.station_id,
    cs.station_name,

    COUNT(DISTINCT c.charger_id) AS total_chargers,

    COALESCE(
        AVG(ss.utilization_rate),
        0
    ) AS average_utilization,

    COALESCE(
        AVG(ss.avg_wait_time),
        0
    ) AS average_wait_time,

    COALESCE(
        AVG(ss.queue_length),
        0
    ) AS average_queue_length

FROM charging_station cs

LEFT JOIN charger c
    ON cs.station_id = c.station_id

LEFT JOIN station_snapshot ss
    ON cs.station_id = ss.station_id

GROUP BY
    cs.station_id,
    cs.station_name;


-- ============================================================
-- 21. VIEW - STATION DEMAND
-- ============================================================

CREATE VIEW station_demand_view AS
SELECT

    cs.station_id,
    cs.station_name,

    DATE(ss.snapshot_time) AS demand_date,

    HOUR(ss.snapshot_time) AS demand_hour,

    AVG(ss.occupied_count) AS average_occupied,

    AVG(ss.queue_length) AS average_queue,

    AVG(ss.avg_wait_time) AS average_wait,

    AVG(ss.utilization_rate) AS average_utilization

FROM charging_station cs

JOIN station_snapshot ss
    ON cs.station_id = ss.station_id

GROUP BY
    cs.station_id,
    cs.station_name,
    DATE(ss.snapshot_time),
    HOUR(ss.snapshot_time);


-- ============================================================
-- 22. VIEW - STATION RATINGS
-- ============================================================

CREATE VIEW station_rating_view AS
SELECT

    cs.station_id,
    cs.station_name,

    COUNT(sr.rating_id) AS total_ratings,

    COALESCE(
        AVG(sr.rating),
        0
    ) AS average_rating

FROM charging_station cs

LEFT JOIN station_rating sr
    ON cs.station_id = sr.station_id

GROUP BY
    cs.station_id,
    cs.station_name;


-- ============================================================
-- 23. VIEW - STATION RECOMMENDATION DATA
-- ============================================================

CREATE VIEW station_recommendation_view AS

SELECT

    cs.station_id,
    cs.station_name,
    cs.address,

    c.charger_id,
    c.connector_type,
    c.power_kw,

    c.status AS charger_status,

    COALESCE(ss.available_count, 0)
        AS available_count,

    COALESCE(ss.queue_length, 0)
        AS queue_length,

    COALESCE(ss.avg_wait_time, 0)
        AS avg_wait_time,

    COALESCE(ss.utilization_rate, 0)
        AS utilization_rate,

    COALESCE(df.predicted_demand, 0)
        AS predicted_demand,

    COALESCE(df.predicted_queue, 0)
        AS predicted_queue,

    COALESCE(df.predicted_wait, 0)
        AS predicted_wait,

    COALESCE(pp.price_per_kwh, 0)
        AS price_per_kwh,

    COALESCE(sr.average_rating, 0)
        AS average_rating

FROM charging_station cs

JOIN charger c
    ON cs.station_id = c.station_id

LEFT JOIN station_snapshot ss
    ON cs.station_id = ss.station_id

LEFT JOIN demand_forecast df
    ON cs.station_id = df.station_id

LEFT JOIN pricing_plan pp
    ON cs.station_id = pp.station_id

LEFT JOIN station_rating_view sr
    ON cs.station_id = sr.station_id

WHERE
    cs.status = 'ACTIVE';


-- ============================================================
-- 24. BASIC DASHBOARD QUERIES
-- ============================================================


-- All active stations

SELECT *
FROM charging_station
WHERE status = 'ACTIVE';


-- Available chargers

SELECT
    c.charger_id,
    cs.station_name,
    c.connector_type,
    c.power_kw,
    c.status

FROM charger c

JOIN charging_station cs
    ON c.station_id = cs.station_id

WHERE c.status = 'AVAILABLE';


-- Current congestion

SELECT *

FROM station_congestion_view

ORDER BY utilization_rate DESC;


-- Station utilization

SELECT *

FROM station_utilization_view

ORDER BY average_utilization DESC;


-- Station ratings

SELECT *

FROM station_rating_view

ORDER BY average_rating DESC;


-- ============================================================
-- 25. ANALYTICAL QUERIES
-- ============================================================


-- Most utilized stations

SELECT

    station_id,
    station_name,
    average_utilization

FROM station_utilization_view

ORDER BY average_utilization DESC;


-- Stations with high congestion

SELECT *

FROM station_congestion_view

WHERE congestion_level = 'HIGH';


-- Average waiting time by station

SELECT

    station_name,
    average_wait_time

FROM station_utilization_view

ORDER BY average_wait_time DESC;


-- Average queue by station

SELECT

    station_name,
    average_queue_length

FROM station_utilization_view

ORDER BY average_queue_length DESC;


-- Historical demand by hour

SELECT

    demand_hour,

    AVG(average_occupied) AS avg_occupied,
    AVG(average_queue) AS avg_queue,
    AVG(average_wait) AS avg_wait

FROM station_demand_view

GROUP BY demand_hour

ORDER BY demand_hour;


-- Peak charging hours

SELECT

    demand_hour,

    AVG(average_occupied) AS avg_occupied

FROM station_demand_view

GROUP BY demand_hour

ORDER BY avg_occupied DESC;


-- Revenue by station

SELECT

    cs.station_id,
    cs.station_name,

    COUNT(csess.session_id) AS total_sessions,

    COALESCE(
        SUM(csess.cost),
        0
    ) AS total_revenue

FROM charging_station cs

JOIN charger c
    ON cs.station_id = c.station_id

LEFT JOIN charging_session csess
    ON c.charger_id = csess.charger_id

GROUP BY
    cs.station_id,
    cs.station_name

ORDER BY total_revenue DESC;


-- ============================================================
-- 26. STATION RECOMMENDATION QUERY
-- ============================================================

/*
    Replace 'CCS2' with the connector type
    required by the user's vehicle.
*/

SELECT

    station_id,
    station_name,
    address,

    charger_id,
    connector_type,
    power_kw,

    available_count,
    queue_length,
    avg_wait_time,
    utilization_rate,

    predicted_demand,
    predicted_queue,
    predicted_wait,

    price_per_kwh,
    average_rating,

    (
        (available_count * 5)
        - (queue_length * 3)
        - (avg_wait_time * 0.5)
        - (utilization_rate * 0.05)
        - (predicted_queue * 2)
        - (predicted_wait * 0.3)
        + (average_rating * 2)
    ) AS recommendation_score

FROM station_recommendation_view

WHERE connector_type = 'CCS2'
  AND charger_status = 'AVAILABLE'

ORDER BY recommendation_score DESC;


-- ============================================================
-- END OF EVCHARGE DATABASE
-- ============================================================