const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
  yesterday.setDate(yesterday.getDate() - 1);
}
console.log(yesterday.toISOString().split('T')[0]);
