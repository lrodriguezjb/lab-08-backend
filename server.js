"use strict";

require("dotenv").config();

// Application Dependencies
const express = require("express");
const superagent = require("superagent");
const cors = require("cors");
const pg = require("pg");

// Application Setup
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

const client = new pg.Client(process.env.DATABASE_URL);
client.on("err", err => {
  throw err;
});

let locations = {};

// Route Definitions
app.get("/location", locationHandler);
app.get("/weather", weatherHandler);
// app.get('/event', eventHandler);
// app.get('/add', addHandler);
app.get("/trails", trailsHandler);
app.use("*", notFoundHandler);
app.use(errorHandler);

function locationHandler(request, response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

  if (locations[url]) {
    response.send(locations[url]);
  } else {
    superagent
      .get(url)
      .then(data => {
        const geoData = data.body;
        const location = new Location(request.query.data, geoData);
        locations[url] = location;
        let latitude = location.latitude;
        let longitude = location.longitude;
        let SQL = `INSERT INTO location (latitude, longitude ) VALUES ($1, $2) RETURNING *`;
        let safeValues = [latitude, longitude];
        client
          .query(SQL, safeValues)
          .then(results => {
            response.status(200).json(results);
            console.log(`added new localion ${results}`);
          })
          .catch(err => console.error(err));
        // console.log(data.body);
        response.send(location);
      })
      .catch(() => {
        errorHandler("So sorry, something went wrong.", request, response);
      });
  }
}

function Location(query, geoData) {
  this.search_query = query;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

function weatherHandler(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent
    .get(url)
    .then(data => {
      const weatherSummaries = data.body.daily.data.map(day => {
        return new Weather(day);
      });
      response.status(200).json(weatherSummaries);
    })
    .catch(() => {
      errorHandler("So sorry, something went wrong.", request, response);
    });
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

// https://www.eventbrite.com/oauth/authorize?response_type=token&client_id=5TWV3PAFRY6HLXLYVERF&redirect_uri=https://www.eventbriteapi.com/v3/events/search?location.address=vancovuer&location.within=10km&expand=venue

//https://www.eventbriteapi.com/v3/events/search?location.address=vancovuer&location.within=10km&expand=venue
// function eventHandler(request, response) {
//   const url = `https://www.eventbrite.com/oauth/authorize?response_type=token&client_id=YOUR_API_KEY&redirect_uri=5TWV3PAFRY6HLXLYVERF${request.query.data}&key=${process.env.EVENTBRITE_API_KEY}`;

//   if (event[url]) {
//     response.send(event[url]);
//   }
//   else {
//     superagent.get(url)
//       .then(data => {
//         const eventData = data.body;
//         const event = new Event(request.query.data, eventData);
//         event[url] = event;
//         response.send(event);
//       })
//       .catch(() => {
//         errorHandler('So sorry, something went wrong.', request, response);
//       });
//   }
// }

// function Event(eventData) {
//   // this.search_query = query;
//   // this.event = eventData;
//   this.link = event;
//   this.name = name;
//   this.event_data = eventData;
//   this.summary = event.summary;

// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// https://www.hikingproject.com/data/get-trails?lat=40.0274&lon=-105.2519&maxDistance=10&key=200632717-2cb4e4ee4b4db951e56453ae07aff93a
function trailsHandler(request, response) {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&maxDistance=10&key=${process.env.TRAIL_API_KEY}`;
  superagent
    .get(url)
    .then(data => {
      // console.log(data.body.trails);
      const trailsData = data.body.trails.map(trail => {
        return new Trail(trail);
      });
      response.status(200).json(trailsData);
    })
    .catch(() => {
      errorHandler("So sorry, something went wrong.", request, response);
    });
}

function Trail(trails) {
  this.name = trails.name;
  this.location = trails.location;
  this.length = trails.length;
  this.stars = trails.stars;
  this.star_votes = trails.starVotes;
  this.summary = trails.summary;
  this.trail_url = trails.url;
  this.conditions = trails.conditionStatus;
  this.condition_date = trails.conditionDate;
  // this.condition_time = trails.
}

app.get("/get", (request, response) => {
  let SQL = `SELECT * FROM location`;
  client
    .query(SQL)
    .then(results => {
      response.status(200).json(results.rows);
      console.log(results.rows);
    })
    .catch(err => console.err(err));
});

function notFoundHandler(request, response) {
  response.status(404).send("huh?");
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}

client
  .connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`);
    });
  })
  .catch(err => {
    throw `PG startup error ${err.message}`;
  });
