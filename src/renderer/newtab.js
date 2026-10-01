document.querySelectorAll('.filters button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  });
});

const newsletter = document.querySelector('.newsletter form');
newsletter?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = newsletter.querySelector('button');
  button.textContent = 'Жазылдыңыз';
  button.disabled = true;
});
