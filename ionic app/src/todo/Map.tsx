import React from "react";
import {withScriptjs, withGoogleMap, GoogleMap, Marker} from 'react-google-maps';
import {compose, withProps} from 'recompose';
import InfoWindow from "react-google-maps/lib/components/InfoWindow";


const mapsApiKey = 'AIzaSyD4oQyAY1M0bVU8O6WqQugVlUyzVrB3t60';

interface MyMapProps {
    lat?: number;
    lng?: number;
    myLat: number;
    myLng: number;
    onMapClick: (e: any) => void,
}

var iconPin = {
    path: 'M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z',
    fillColor: '#3461eb',
    fillOpacity: 1,
    scale: 0.04, //to reduce the size of icons
};


export const MyMap =
    compose<MyMapProps, any>(
        withProps({
            googleMapURL:
                `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&v=3.exp&libraries=geometry,drawing,places`,
            loadingElement: <div style={{height: `100%`}}/>,
            containerElement: <div style={{height: '400px', width: '100%'}}/>,
            mapElement: <div style={{height: '100%', width: '100%'}}/>
        }),
        withScriptjs,
        withGoogleMap
    )(props => (
        <GoogleMap
            defaultZoom={8}
            defaultCenter={{lat: props.lat ? props.lat : props.myLat, lng: props.lng ? props.lng : props.myLng}}
            onClick={props.onMapClick}>
            {(props.lat && props.lng &&
                <Marker
                    position={{lat: props.lat, lng: props.lng}}
                />)
            }
            <Marker icon={iconPin} position={{lat: props.myLat, lng: props.myLng}}/>
        </GoogleMap>
    ))
