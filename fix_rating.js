
const fs = require("fs");
let content = fs.readFileSync("app/components/ExperienceForm.tsx", "utf-8");

const oldButton = `<button key={rating.value} type="button" className={answer.rating === rating.value && !answer.skipped ? styles.selected : ""} onClick={() => chooseRating(rating.value)}>{rating.label}</button>`;
const newButton = `<button key={rating.value} type="button" className={answer.rating === rating.value && !answer.skipped ? styles.selected : ""} data-rating={rating.value} onClick={() => chooseRating(rating.value)}>{rating.label}</button>`;

content = content.replace(oldButton, newButton);

fs.writeFileSync("app/components/ExperienceForm.tsx", content);

