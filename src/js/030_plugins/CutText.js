//文字列を指定した長さごとに改行を入れる
function CutText(srcText, between) {
  between = between || 20;

  function splitByLength(str, length) {
    if (!str || !length || length < 1) return [];
    var regexPattern = new RegExp('(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]){1,' + length + '}','g');
    return str.match(regexPattern) || [];
  }

  let destText = "";
  const list = srcText.split('\n');
  list.forEach(text => {
    const line = splitByLength(text, between);
    line.forEach(t => destText += t + "\n");
  });
  return destText;
}
