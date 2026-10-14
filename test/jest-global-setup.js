// Los tests corren con la misma política de fechas que la app (ver src/config/timezone.ts):
// el proceso en UTC. Se fija aquí, antes de crear los workers de Jest, porque dentro de un test
// cambiar process.env.TZ no afecta al proceso real.
module.exports = async () => {
  process.env.TZ = 'UTC';
};
