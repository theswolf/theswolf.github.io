let workouts = [];
let currentWorkout = 0;
let currentSegment = 0;
let currentTime = 0;
let timerInterval;
let isPaused = false;
let chart;
let wakeLock = null;


fetch('./data/workouts.json')
    .then(response => response.json())
    .then(data => {
        workouts = data;
        populateWorkoutSelect();
        displayWorkout();
    });

function populateWorkoutSelect() {
    const workoutSelect = document.getElementById('workoutSelect');
    workouts.forEach((workout, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = workout.name;
        workoutSelect.appendChild(option);
    });
    workoutSelect.addEventListener('change', (event) => {
        currentWorkout = event.target.value;
        currentSegment = 0;
        currentTime = 0;
        clearInterval(timerInterval);
        document.getElementById('timer').textContent = '00:00';
        document.getElementById('pauseButton').textContent = 'Pause';
        displayWorkout();
    });
}

function displayWorkout() {
    const workout = workouts[currentWorkout];
    const labels = [];
    const data = [];
    let totalTime = 0;

    workout.segments.forEach(segment => {
        const segmentDuration = segment.duration;
        const segmentIntensity = segment.intensity;
        for (let i = 0; i < segmentDuration; i += 30) {
            labels.push(totalTime / 60);
            data.push(segmentIntensity);
            totalTime += 30;
        }
    });

    const ctx = document.getElementById('workoutChart').getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Intensity',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (minutes)'
                    }
                },
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Intensity'
                    }
                }
            }
        }
    });
}

function updateTimer() {
    if (currentTime > 0) {
        currentTime--;
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        document.getElementById('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Play beep sound on the last 3 seconds of each segment
        if (currentTime <= 3) {
            document.getElementById('beepSound').play();
            document.getElementById('timer').classList.add('blinking');
        } else {
            document.getElementById('timer').classList.remove('blinking');
        }
    } else {
        document.getElementById('timer').classList.remove('blinking');
        currentSegment++;
        if (currentSegment < workouts[currentWorkout].segments.length) {
            currentTime = workouts[currentWorkout].segments[currentSegment].duration;
            document.getElementById('startSound').play(); // Play the start sound
        } else {
            clearInterval(timerInterval);
            document.getElementById('timer').textContent = 'Workout Complete!';
        }
    }
    const intensity = workouts[currentWorkout].segments[currentSegment].status;
    document.getElementById('intensity').textContent = `Current: ${intensity}`;

    const nextSegment = workouts[currentWorkout].segments[currentSegment + 1];
    if (nextSegment) {
        const nextMinutes = Math.floor(nextSegment.duration / 60);
        const nextSeconds = nextSegment.duration % 60;
        const nextSegmentText = `Next: ${nextSegment.status} (${String(nextMinutes).padStart(2, '0')}:${String(nextSeconds).padStart(2, '0')})`;
        document.getElementById('nextSegment').textContent = nextSegmentText;
    } else {
        document.getElementById('nextSegment').textContent = 'Next: N/A';
    }

    updateSegmentCountdown();
}

function updateSegmentCountdown() {
    const segmentTime = workouts[currentWorkout].segments[currentSegment].duration;
    const remainingTime = currentTime;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    document.getElementById('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const segmentProgress = (segmentTime - remainingTime) / segmentTime * 100;
    document.getElementById('segmentProgress').value = segmentProgress;

    const totalTime = workouts[currentWorkout].segments.reduce((acc, segment) => acc + segment.duration, 0);
    const elapsedTotalTime = workouts[currentWorkout].segments.slice(0, currentSegment).reduce((acc, segment) => acc + segment.duration, 0) + (segmentTime - remainingTime);
    const totalProgress = elapsedTotalTime / totalTime * 100;
    document.getElementById('totalProgress').value = totalProgress;
}

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
        });
        console.log('Wake Lock is active');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
            });
    }
}

document.getElementById('startButton').addEventListener('click', () => {
    if (!isPaused) {
        currentTime = workouts[currentWorkout].segments[currentSegment].duration;
        timerInterval = setInterval(updateTimer, 1000);
        isPaused = false;
        document.getElementById('startSound').play(); // Play the start sound
        updateSegmentCountdown();
        requestWakeLock(); // Request wake lock
    }
});

document.getElementById('pauseButton').addEventListener('click', () => {
    if (isPaused) {
        timerInterval = setInterval(updateTimer, 1000);
        isPaused = false;
        document.getElementById('pauseButton').textContent = 'Pause';
        requestWakeLock(); // Request wake lock
    } else {
        clearInterval(timerInterval);
        isPaused = true;
        document.getElementById('pauseButton').textContent = 'Resume';
        releaseWakeLock(); // Release wake lock
    }
});

document.getElementById('resetButton').addEventListener('click', () => {
    clearInterval(timerInterval);
    currentSegment = 0;
    currentTime = 0;
    isPaused = false;
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('pauseButton').textContent = 'Pause';
    releaseWakeLock(); // Release wake lock
});

document.getElementById('showChartButton').addEventListener('click', () => {
    const chart = document.getElementById('workoutChart');
    if (chart.style.display === 'none') {
        chart.style.display = 'block';
        document.getElementById('showChartButton').textContent = 'Hide Chart';
    } else {
        chart.style.display = 'none';
        document.getElementById('showChartButton').textContent = 'Show Chart';
    }
});