function initMap(){

    // 21.231301663061167, 72.76193586313474

    map = new google.maps.Map(document.getElementById('map'),{
        center: {lat:21.126531052281653, lng: 72.73267563634262},
        zoom:17,
        mapId:'50ca45ec7c4affe3',
        mapTypeId:'satellite',
        disableDefaultUI:true
    })

    new google.maps.Marker({
        position:{lat:21.126531052281653, lng:72.73267563634262},
        map,
        title:"Dhanush Villa",
        icon:{
            url:"pin.png"
        },
        animation:google.maps.Animation.DROP
    })

    const flightPlanCoordinates = [

        { lat: 21.1267553740179,   lng: 72.73184346298926 },
        { lat: 21.126818807066563, lng: 72.73252486545898 },
        { lat: 21.127559594693274, lng: 72.73239116693077 },
        { lat: 21.127580887236338, lng: 72.73289706812838 },
        { lat: 21.12634392892101,  lng: 72.73327462062113 },
        {lat:21.126148814183455,   lng: 72.73227470945375 },
        {lat:21.12601405050808,    lng: 72.73172804724712 },
        { lat: 21.1267553740179,   lng: 72.73184346298926 },
    
      ];

      const flightPath = new google.maps.Polyline({
        path: flightPlanCoordinates,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 4,
      });
      flightPath.setMap(map);
}

