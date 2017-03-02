function level0() {
  var x = 0;
  var y = 1000;
  var i = 0;
  var counter = document.getElementById('counter');
  function level1() {
    var one = 1;
    x += 1;
    level2();
  }

  function level2() {
    var minusOne = -1;
    y += minusOne;
    level3();
  }

  function level3() {
    var a = x + 2;
    i++;
    debugger;
    counter.innerHTML = '';
    counter.appendChild(document.createTextNode(i));
    level4(() => {
      var b = a * y;
      setTimeout(level1, 1000);
    });
  }

  function level4(cb) {
    var c = x + y;
    if (cb) cb();
  }

  level1();
}