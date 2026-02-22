export const getRandomFace = () => {
  const FACES = ['(･。･)?', '(･へ･)', '(-_-)zzz', 'Σ(-｡-)', '(^o^)', '(LOL)', 'θwθ', '(T_T)', '(*_*)', '・ω・', '(*´∀｀)'];

  const random = Math.round(Math.random() * (FACES.length - 1));
  return FACES[random];
};
