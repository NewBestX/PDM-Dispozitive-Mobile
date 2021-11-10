import React, {useContext, useEffect, useState} from 'react';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar,
    IonItem,
    IonDatetime,
    IonLabel,
    IonCheckbox,
    IonFab,
    IonFabButton,
    IonIcon,
    IonActionSheet,
    IonGrid,
    IonRow,
    IonCol, createAnimation
} from '@ionic/react';
import {getLogger} from '../core';
import {ItemContext} from './ItemProvider';
import {RouteComponentProps} from 'react-router';
import {ItemProps} from './ItemProps';
import {CameraResultType, CameraSource} from "@capacitor/core";
import {useCamera} from "@ionic/react-hooks/camera";
import {camera, trash, close} from "ionicons/icons";
import {base64FromPath} from "@ionic/react-hooks/filesystem";
import {useMyLocation} from "./useMyLocation";
import {MyMap} from "./Map";

const log = getLogger('ItemEdit');

interface ItemEditProps extends RouteComponentProps<{
    id?: string;
}> {
}

const ItemEdit: React.FC<ItemEditProps> = ({history, match}) => {
    const {getPhoto} = useCamera();
    const [deleteDialog, setDeleteDialog] = useState(false);
    const {items, saving, savingError, saveItem, failedToSyncItems} = useContext(ItemContext);
    const [titlu, setTitlu] = useState('');
    const [regizor, setRegizor] = useState('');
    const [dataAparitiei, setDataAparitiei] = useState(new Date());
    const [durata, setDurata] = useState(0);
    const [vazut, setVazut] = useState(false);
    const [item, setItem] = useState<ItemProps>();
    const [failedSyncItem, setFailedSyncItem] = useState<ItemProps>();
    const [photo, setPhoto] = useState<any>();
    const myLocation = useMyLocation();
    const [location, setLocation] = useState<any>();
    const [myMapLoc, setMyMapLoc] = useState({lat: 0, long: 0});

    useEffect(() => {
        const {latitude: lat, longitude: lng} = myLocation.position?.coords || {}

        if (lat && lng) {
            setMyMapLoc({lat: lat, long: lng});
        }
    }, [myLocation]);

    useEffect(() => {
        log('useEffect');
        const routeId = match.params.id || '';
        const item = items?.find(it => it._id === routeId);
        setItem(item);
        const fsi = failedToSyncItems?.find(it => it._id === routeId);
        if (fsi)
            setFailedSyncItem(fsi);
        if (item) {
            setTitlu(item.titlu);
            setRegizor(item.regizor);
            setDataAparitiei(item.dataAparitiei);
            setDurata(item.durata);
            setVazut(item.vazut);
            setPhoto(item.photo);
            setLocation(item.location);
        }
    }, [match.params.id, items, failedToSyncItems]);
    const handleSave = () => {
        let editedItem: ItemProps = item ? {
            ...item,
            titlu,
            regizor,
            dataAparitiei,
            durata,
            vazut,
            lastEditDate: new Date(),
        } : {
            titlu,
            regizor,
            dataAparitiei,
            durata,
            vazut,
            lastEditDate: new Date(),
        };

        if (photo)
            editedItem = {...editedItem, photo};
        else
            delete editedItem['photo'];

        if (location)
            editedItem = {...editedItem, location};
        else
            delete editedItem['location'];
        log('LAST EDIT DATE: ' + editedItem.lastEditDate)
        saveItem && saveItem(editedItem).then(() => history.goBack());
    };

    const takePhoto = async () => {
        const cameraPhoto = await getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100,
            width: 50,
            height: 50
        });
        const base64Data = await base64FromPath(cameraPhoto.webPath!);

        setPhoto({webviewPath: base64Data});
    };

    const setMapPosition = (e: any) => {
        setLocation({lat: e.latLng.lat(), long: e.latLng.lng()});
    }

    const enterAnimation = (baseEl: any) => {
        const backdropAnimation = createAnimation()
            .addElement(baseEl)
            .fromTo('opacity', 0.1, 1);

        return createAnimation()
            .addElement(baseEl)
            .duration(500)
            .addAnimation([backdropAnimation]);
    }

    const leaveAnimation = (baseEl: any) => {
        return enterAnimation(baseEl).direction('reverse');
    }

    useEffect(simpleAnimation, []);
    useEffect(groupAnimations, []);
    useEffect(chainAnimations, []);

    log('render');
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle id='anim1'>Edit</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={handleSave}>
                            Save
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonItem>
                    <IonLabel
                        id='anim21'>Titlu{((failedSyncItem && failedSyncItem?.titlu !== titlu) ? ' (local: ' + failedSyncItem.titlu + ')' : '')}: </IonLabel>
                    <IonInput id='anim22' value={titlu} onIonChange={e => setTitlu(e.detail.value || '')}/>
                </IonItem>
                <IonItem id='anim31'>
                    <IonLabel>Regizor{((failedSyncItem && failedSyncItem?.regizor !== regizor) ? ' (local: ' + failedSyncItem.regizor + ')' : '')}: </IonLabel>
                    <IonInput value={regizor} onIonChange={e => setRegizor(e.detail.value || '')}/>
                </IonItem>
                <IonItem id='anim32'>
                    <IonLabel>Data
                        aparitiei{((failedSyncItem && failedSyncItem?.dataAparitiei !== dataAparitiei) ? ' (local: ' + failedSyncItem.dataAparitiei.toString() + ')' : '')}: </IonLabel>
                    <IonDatetime displayFormat="DD/MM/YYYY" placeholder="Select Date" value={dataAparitiei.toString()}
                                 onIonChange={e => setDataAparitiei(new Date(e.detail.value || ''))}/>
                </IonItem>
                <IonItem id='anim33'>
                    <IonLabel>Durata{((failedSyncItem && failedSyncItem?.durata !== durata) ? ' (local: ' + failedSyncItem.durata + ')' : '')}: </IonLabel>
                    <IonInput value={durata} onIonChange={e => setDurata(Number.parseInt(e.detail.value || '0'))}/>
                </IonItem>
                <IonItem id='anim34'>
                    <IonLabel>Vazut{((failedSyncItem && failedSyncItem?.vazut !== vazut) ? ' (local: ' + failedSyncItem.vazut + ')' : '')}: </IonLabel>
                    <IonCheckbox checked={vazut} onIonChange={e => setVazut(e.detail.checked)}/>
                </IonItem>
                <IonItem onClick={() => photo && setDeleteDialog(true)}>
                    <IonLabel>Imagine: </IonLabel>
                    {(photo && <img src={photo.webviewPath} alt='' width='300px'/>)}
                </IonItem>
                <IonItem>
                    <IonGrid>
                        <IonRow>
                            <IonLabel>Locatie: {(location && location.long + " / " + location.lat)}</IonLabel>
                        </IonRow>
                        <IonRow>
                            <MyMap
                                lat={location?.lat}
                                lng={location?.long}
                                myLat={myMapLoc.lat}
                                myLng={myMapLoc.long}
                                onMapClick={setMapPosition}
                            />
                        </IonRow>
                    </IonGrid>
                </IonItem>


                <IonLoading isOpen={saving}/>
                {savingError && (
                    <div>{savingError.message || 'Failed to save item'}</div>
                )}
                <IonFab vertical="bottom" horizontal="center" slot="fixed">
                    <IonFabButton onClick={() => takePhoto()}>
                        <IonIcon icon={camera}/>
                    </IonFabButton>
                </IonFab>
                <IonActionSheet leaveAnimation={leaveAnimation}
                                isOpen={deleteDialog}
                                buttons={[{
                                    text: 'Delete',
                                    role: 'destructive',
                                    icon: trash,
                                    handler: () => {
                                        setPhoto(null);
                                    }
                                }, {
                                    text: 'Cancel',
                                    icon: close,
                                    role: 'cancel'
                                }]}
                                onDidDismiss={() => setDeleteDialog(false)}
                />
            </IonContent>
        </IonPage>
    );
};

function simpleAnimation() {
    const el = document.querySelector('#anim1');
    if (el) {
        const animation = createAnimation()
            .addElement(el)
            .duration(1000)
            .direction('alternate')
            .iterations(Infinity)
            .keyframes([
                {transform: 'scale(1)', opacity: '1'},
                {transform: 'scale(0.5)', opacity: '0.5'}
            ]);
        animation.play();
    }
}

function groupAnimations() {
    const elB = document.querySelector('#anim21');
    const elC = document.querySelector('#anim22');
    if (elB && elC) {
        console.log("SUNT AICI");
        const animationA = createAnimation()
            .addElement(elB)
            .direction('alternate')
            .iterations(2)
            .fromTo("transform", "translateX(0px)", "translateX(50px)")
        const animationB = createAnimation()
            .addElement(elC)
            .direction('alternate')
            .iterations(2)
            .fromTo("transform", "translateX(0px)", "translateX(50px)")
        const parentAnimation = createAnimation()
            .duration(500)
            .addAnimation([animationA, animationB]);
        parentAnimation.play();
    }
}

function chainAnimations() {
    const elA = document.querySelector('#anim31');
    const elB = document.querySelector('#anim32');
    const elC = document.querySelector('#anim33');
    const elD = document.querySelector('#anim34');
    if (elA && elB && elC && elD) {
        const animationA = createAnimation()
            .addElement(elA)
            .duration(500)
            .fromTo('opacity', 0.1, 1);
        const animationB = createAnimation()
            .addElement(elB)
            .duration(500)
            .fromTo('opacity', 0.1, 1);
        const animationC = createAnimation()
            .addElement(elC)
            .duration(500)
            .fromTo('opacity', 0.1, 1);
        const animationD = createAnimation()
            .addElement(elD)
            .duration(500)
            .fromTo('opacity', 0.1, 1);
        (async () => {
            await animationA.play();
            await animationB.play();
            await animationC.play();
            await animationD.play();
        })();
    }
}

export default ItemEdit;
