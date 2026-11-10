# ---------- Stage 1: build the React frontend ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: build the Spring Boot JAR with React bundled inside ----------
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist ./src/main/resources/static
RUN mvn -B -q clean package -DskipTests

# ---------- Stage 3: small runtime image ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --create-home mango && mkdir -p /app/data && chown -R mango /app
COPY --from=backend --chown=mango /app/backend/target/mango-bus-api-*.jar /app/app.jar
USER mango

# Render terminates HTTPS at its load balancer, so the app itself serves plain HTTP.
ENV MANGO_SSL_ENABLED=false
# Keep memory low enough for Render's 512 MB free instances.
ENV JAVA_OPTS="-Xmx300m -Xss512k -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m"
# Trust Render's X-Forwarded-* headers so the app knows requests arrive over HTTPS.
ENV SERVER_FORWARD_HEADERS_STRATEGY=framework

EXPOSE 10000
# Render injects PORT (default 10000) and RENDER_EXTERNAL_URL (the public https URL).
# The URL is used as the allowed origin for the app, unless FRONTEND_ORIGIN is set manually.
ENTRYPOINT ["sh", "-c", "if [ -z \"$FRONTEND_ORIGIN\" ] && [ -n \"$RENDER_EXTERNAL_URL\" ]; then export FRONTEND_ORIGIN=\"$RENDER_EXTERNAL_URL\"; fi; exec java $JAVA_OPTS -jar /app/app.jar"]
