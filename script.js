const catBtn = document.getElementById('cat-btn');
const catContainer = document.getElementById('cat-container');
const catImage = document.getElementById('cat-image');

// List of cat images in your assets folder
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
    
    // Ensure we pick a different cat than the last one
    do {
        randomIndex = Math.floor(Math.random() * cats.length);
    } while (randomIndex === lastIndex);
    
    lastIndex = randomIndex;

    // If it's the first click, show the container
    if (catContainer.classList.contains('hidden')) {
        catImage.src = cats[randomIndex];
        catContainer.classList.remove('hidden');
    } else {
        // Fade out slightly then change image for a "shuffling" feel
        catContainer.style.opacity = '0';
        
        setTimeout(() => {
            catImage.src = cats[randomIndex];
            catContainer.style.opacity = '1';
        }, 300);
    }
});
