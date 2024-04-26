'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 179);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1);
// console.log(cycling1);

///////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const removeAllBtn = document.querySelector('#remove-all-btn');
const sortAll = document.querySelector('#sort-all');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLvl = 13;
  #removeBtnSingle;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    this.#removeBtnSingle = document.querySelectorAll('.remove_workout');

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._taggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // containerWorkouts.addEventListener('click', this._editWorkouts.bind(this));
    removeAllBtn.addEventListener('click', this._deleteLocalStorage.bind(this));
    sortAll.addEventListener('change', e => {
      e.preventDefault();

      this._sortWorkouts(e.target.value);
    });
    console.log(this.#removeBtnSingle);
    this.#removeBtnSingle.forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.dataset.id;

        this._deleteSingleEl(id);
      });
    });
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _taggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running ,create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling ,create running cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render warkout on map as marker
    this._renderWorkoutMarker(workout);

    // Render warkout
    this._renderWorkout(workout);

    // Hide form Clear input fields + Clear inputs
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
         <button class="remove_workout" data-id="${workout.id}">❌</button>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running')
      html += `
         <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.pace.toFixed(1)}</span>
         <span class="workout__unit">min/km</span>
       </div>
       <div class="workout__details">
         <span class="workout__icon">🦶🏼</span>
         <span class="workout__value">${workout.cadence}</span>
         <span class="workout__unit">spm</span>
       </div>
     </li>`;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    if (!workout) return;

    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the publick interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _deleteLocalStorage() {
    localStorage.removeItem('workouts');
  }

  _sortWorkouts(sortType) {
    console.log(sortType);

    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;


    if (sortType === 'date') {
      console.log(data);
      const sortedDate = this.#workouts.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      console.log(sorted);
    } else {
      console.log(this.#workouts);
      this.#workouts.sort((a, b) => b.distance - a.distance);
      console.log(this.#workouts);
    }

    this._removeWorkoutsFromHTML();

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _removeWorkoutsFromHTML() {
    //
    const el = document.querySelectorAll('.workout');
    el.forEach(work => work.remove());
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deleteSingleEl(idEl) {
    this.#workouts = this.#workouts.filter(function (x) {
      return x.id !== idEl;
    });

    this._setLocalStorage();
    this._removeWorkoutsFromHTML();

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });

    this.#removeBtnSingle = document.querySelectorAll('.remove_workout');

    this.#removeBtnSingle.forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.dataset.id;

        this._deleteSingleEl(id);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', event => {
  // console.log('DOM fully loaded and parsed');
  const app = new App();
});
