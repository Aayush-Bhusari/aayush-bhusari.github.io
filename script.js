const catBtn = document.getElementById('cat-btn');
const catContainer = document.getElementById('cat-container');
const catImage = document.getElementById('cat-image');

const cats = [
    'assets/cat1.jpg',
    'assets/cat2.jpg',
    'assets/cat3.jpg',
    'assets/cat4.jpg',
    'assets/cat5.jpg'
];

let lastIndex = -1;

catBtn.addEventListener('click', () => {
    let randomIndex;
    
    // 1. Pick a new random index
    do {
        randomIndex = Math.floor(Math.random() * cats.length);
    } while (randomIndex === lastIndex);
    
    lastIndex = randomIndex;

    // 2. Smooth Transition Logic
    catContainer.style.opacity = '0'; // Hide current
    
    setTimeout(() => {
        catImage.src = cats[randomIndex];
        
        // 3. Wait for the image to actually load before showing it
        catImage.onload = () => {
            catContainer.classList.remove('hidden');
            catContainer.style.opacity = '1';
        };

        // Fallback for cached images
        if(catImage.complete) {
            catContainer.classList.remove('hidden');
            catContainer.style.opacity = '1';
        }
    }, 200); 
});
