import React from 'react';
import {IonItem, IonLabel} from '@ionic/react';
import {ItemProps} from './ItemProps';

interface ItemPropsExt extends ItemProps {
    onEdit: (_id?: string) => void;
    failedToSync?: boolean
}

const Item: React.FC<ItemPropsExt> = ({_id, titlu, regizor, dataAparitiei, durata, vazut, lastEditDate, hasLocalEdits, onEdit, failedToSync, photo}) => {
    console.log("Create item" + titlu + " -- " + _id);
    return (
        <IonItem onClick={() => onEdit(_id)}>
            {(photo && <img src={photo.webviewPath} alt='' height='50px' slot={"end"}/>)}
            <IonLabel>{titlu} ({JSON.stringify(dataAparitiei).substr(1, 4)}) {(failedToSync? ' - CONFLICT SALVARE - ' : (hasLocalEdits? '*': ''))}</IonLabel>
        </IonItem>
    );
};

export default Item;
