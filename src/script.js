const container = document.querySelector('.container');
const rocket = document.querySelector('.rocket');


/*
function get on stack overflow, by user: https://stackoverflow.com/users/1008999/endless
question: https://stackoverflow.com/questions/33948464/move-an-image-with-javascript-using-mouse-events
*/

container.addEventListener('mousemove', e => {
    let div = rocket;
    div.style.position = 'absolute';
    div.style.top = e.clientY + 'px';
    div.style.left = e.clientX + 'px';
})


/*
function get on youtube video, by user Online tutorials > https://www.youtube.com/c/OnlineTutorials4Designers
video link: https://www.youtube.com/watch?v=mAewuQPMFI8
*/

function makeMeteor() {
    let count = 50;
    let i = 0;
    
    while (i < count) {
        let meteor = document.createElement('i')
        let x = Math.floor(Math.random()*window.
        innerWidth);

        let duration = Math.random() * 1;
        let h = Math.random() * 100;

        meteor.style.left = x + 'px';
        meteor.style.width = 1 + 'px';
        meteor.style.height = 80 + h + 'px';
        meteor.style.animationDuration = duration + 's';
        
        container.appendChild(meteor);
        i++
    }
}


/*
function get on youtube video, by user Dev King > https://www.youtube.com/channel/UC33whXQsED5bXjbgt-ICQ1Q
video link: https://www.youtube.com/watch?v=lvaVbUd9zgc
*/

function makeStar() {
    starCount = 50;
    j = 0;

    while (j < starCount) {
        star = document.createElement('i');
        star.classList.add('wow');
        windowX = Math.floor(Math.random() * window.innerWidth);

        duration = Math.random() * 1;

        starWidth = 5;
        starHeight = 5;

        star.style.left = windowX + 'px';
        star.style.width = starWidth + 'px';
        star.style.height = starHeight + 'px';
        star.style.animationDuration = duration + 's';
        star.style.borderRadius = '50%';

        container.appendChild(star);
        j++
    }
}

makeMeteor();
makeStar();
