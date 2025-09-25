export function debounce(fn: any, time: any) {
  let timer: any;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, arguments);
    }, time);
  };
}
