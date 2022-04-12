const others = [{
    lat: 49.255320,
    long: -123.246590,
    name: 'UBC',
    color: 'FF0018'
},
{
    lat: 49.269510,
    long: -123.233840,
    name: 'spanish banks',
    color: '0016FF'
},
{
    lat: 49.271096,
    long: -123.133962,
    name: 'granville island',
    color: 'FF00D3'
}];

const me =
{
    lat: 49.270474,
    long: -123.148580,
    name: 'home',
    color: 'B339A9'
};

const weightedAverage = (nums, weights) => {
    const [sum, weightSum] = weights.reduce(
      (acc, w, i) => {
        acc[0] = acc[0] + nums[i] * w;
        acc[1] = acc[1] + w;
        return acc;
      },
      [0, 0]
    );
    return sum / weightSum;
  };

function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}

//App

let distances = [];
let colors = [];
others.forEach(o => {
    o.distance = calcCrow(me.lat, me.long, o.lat, o.long);
    o.c = parseInt(o.color, 16);

    console.log(`distance from me: ${o.distance}`);

    distances.push(o.distance);
    colors.push(o.c);
});

let weightedAvg = weightedAverage(colors, distances);

console.log(`color: ${weightedAvg}`);

let color = Math.round(weightedAvg).toString(16);
console.log(`color: ${color}`);