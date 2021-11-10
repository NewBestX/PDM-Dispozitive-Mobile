import React, {useContext} from 'react';
import {RouteComponentProps} from 'react-router';
import {
    IonButton, IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonList, IonLoading,
    IonPage, IonTabButton,
    IonTitle,
    IonToolbar, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonLabel, IonCard
} from '@ionic/react';
import {add} from 'ionicons/icons';
import Item from './Item';
import {getLogger} from '../core';
import {ItemContext} from './ItemProvider';
import {AuthContext} from "../auth";
import { createAnimation } from '@ionic/react';


const log = getLogger('ItemList');

const ItemList: React.FC<RouteComponentProps> = ({history}) => {
    const {logout} = useContext(AuthContext);
    const {items, fetching, fetchingError, serverOnline, failedToSyncItems, disableInfiniteScroll, searchNextFn, filter, dispatch} = useContext(ItemContext);
    const handleLogout = () => {
        log('handleLogout...');
        logout?.();
        dispatch({type:'LOGOUT'});
        history.push('/login');
    };

    log('render');
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle slot="start">Filme {serverOnline ? '(online)' : '(offline)'}</IonTitle>
                    <IonCard slot="start">
                        <IonLabel>Filter: </IonLabel>
                        <IonInput value={filter} onIonChange={e => dispatch({type:'FILTER_CHANGED', payload:{filter: e.detail.value || ''}})} />
                    </IonCard>
                    <IonButtons slot="end">
                        <IonButton onClick={() => {
                            handleLogout();
                        }}>Logout</IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                {items && (
                    //<IonList>
                        items.map(({_id, titlu, regizor, dataAparitiei, durata, vazut, lastEditDate, hasLocalEdits, photo}) => {
                            const failedSync = failedToSyncItems?.find(x => x._id === _id);
                            if(failedSync) {
                                return <Item key={_id} _id={_id} titlu={failedSync.titlu} regizor={failedSync.regizor}
                                      dataAparitiei={failedSync.dataAparitiei}
                                      durata={failedSync.durata} vazut={failedSync.vazut} lastEditDate={failedSync.lastEditDate}
                                      hasLocalEdits={failedSync.hasLocalEdits} onEdit={id => history.push(`/item/${id}`)}
                                      failedToSync={true} photo={failedSync.photo}/>
                            }

                            return <Item key={_id} _id={_id} titlu={titlu} regizor={regizor}
                                         dataAparitiei={dataAparitiei}
                                         durata={durata} vazut={vazut} lastEditDate={lastEditDate}
                                         hasLocalEdits={hasLocalEdits} onEdit={id => history.push(`/item/${id}`)}
                                         failedToSync={false} photo={photo}/>
                        })

                    //</IonList>
                )}
                <IonInfiniteScroll threshold="100px"
                                   disabled={disableInfiniteScroll}
                                   onIonInfinite={(e: CustomEvent<void>) => searchNextFn(e)}>
                    <IonInfiniteScrollContent
                        loadingText="Loading more good doggos...">
                    </IonInfiniteScrollContent>
                </IonInfiniteScroll>

                {fetchingError && (
                    <div>{fetchingError.message || 'Failed to fetch items'}</div>
                )}
                <IonFab vertical="bottom" horizontal="end" slot="fixed">
                    <IonFabButton onClick={() => history.push('/item')}>
                        <IonIcon icon={add}/>
                    </IonFabButton>
                </IonFab>
            </IonContent>
        </IonPage>
    );
};

export default ItemList;
