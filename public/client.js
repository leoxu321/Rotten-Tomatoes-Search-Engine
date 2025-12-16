function search(){
    let queryText = document.getElementById("searchBox").value;
    let boost = document.querySelector("[name='boost']:checked").value;
    let limitVal = document.getElementById("limit").value;
    let isFruit = document.querySelector("[name='fruitsOrPersonal']:checked").value == "fruits";

    if (isFruit) {
        window.location.href = 'http://134.117.131.5:3000/fruits?' + 'q=' + queryText+ '&boost=' + boost + '&limit=' + limitVal;
    } else {
        window.location.href = 'http://134.117.131.5:3000/personal?' + 'q=' + queryText+ '&boost=' + boost + '&limit=' + limitVal;
    }
}