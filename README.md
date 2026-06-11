# Notification Application

## Tech Stack

* Frontend: React
* Backend: Node.js + Express
* Styling: Vanilla CSS

## Features

* Add Notification
* View Notifications
* Logging Middleware
* REST API Integration

## Backend Setup

```bash
cd notification_app_be
npm install
node app.js
```

## Frontend Setup

```bash
cd notification_app_fe
npm install
npm start
```

## API Endpoints

### GET /notifications

Returns all notifications.

### POST /notifications

Creates a new notification.

Request:

```json
{
  "message": "Hello Aman"
}
```
