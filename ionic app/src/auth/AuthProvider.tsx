import React, {useCallback, useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {getLogger} from '../core';
import {login as loginApi} from './authApi';

const log = getLogger('AuthProvider');

type LoginFn = (username?: string, password?: string) => void;

export interface AuthState {
    authenticationError: Error | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    login?: LoginFn;
    logout?: () => void;
    pendingAuthentication?: boolean;
    username?: string;
    password?: string;
    token: string;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isAuthenticating: false,
    authenticationError: null,
    pendingAuthentication: true,
    token: '',
};

export const AuthContext = React.createContext<AuthState>(initialState);

interface AuthProviderProps {
    children: PropTypes.ReactNodeLike,
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [state, setState] = useState<AuthState>(initialState);
    const {isAuthenticated, isAuthenticating, authenticationError, pendingAuthentication, token} = state;
    const login = useCallback<LoginFn>(loginCallback, []);
    const logout = () => {
        log('logout')
        localStorage.removeItem('token');
        localStorage.removeItem('items');
        localStorage.removeItem('lastEdit');
        setState({
            ...state,
            isAuthenticated: false,
            token: ''
        });
    }
    useEffect(authenticationEffect, [pendingAuthentication]);
    const value = {isAuthenticated, login, logout, isAuthenticating, authenticationError, token};
    log('render');
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

    function loginCallback(username?: string, password?: string): void {
        log('login');
        setState({
            ...state,
            pendingAuthentication: true,
            username,
            password
        });
    }

    function authenticationEffect() {
        let canceled = false;
        authenticate();
        return () => {
            canceled = true;
        }

        async function authenticate() {
            if (!pendingAuthentication) {
                log('authenticate, !pendingAuthentication, return');
                return;
            }
            try {
                log('authenticate...');
                setState({
                    ...state,
                    isAuthenticating: true,
                });

                const {username, password} = state;

                if (username && password) {
                    log('auth with user and password');
                    const {token} = await loginApi(username, password);
                    if (canceled) {
                        return;
                    }

                    localStorage.setItem('token', JSON.stringify(token));

                    log('authenticate succeeded');
                    setState({
                        ...state,
                        token,
                        pendingAuthentication: false,
                        isAuthenticated: true,
                        isAuthenticating: false,
                    });
                } else {
                    log('auth with token');

                    const value = JSON.parse(localStorage.getItem('token') as string);

                    if (canceled) {
                        return;
                    }

                    if (value && value !== '') {
                        log('authenticate succeeded with token');
                        setState({
                            ...state,
                            token: value,
                            pendingAuthentication: false,
                            isAuthenticated: true,
                            isAuthenticating: false,
                        });
                    } else {
                        log('no token found');
                        setState({
                            ...state,
                            pendingAuthentication: false
                        });
                    }
                }
            } catch (error) {
                if (canceled) {
                    return;
                }
                log('authenticate failed');
                setState({
                    ...state,
                    authenticationError: error,
                    pendingAuthentication: false,
                    isAuthenticating: false,
                });
            }
        }
    }
};



import React, {useContext, useEffect, useState} from 'react';
import {
    IonContent,
    IonHeader,
    IonList,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonTitle,
    IonToolbar,
    useIonViewWillEnter,
    IonItem,
    IonLabel,
    IonInput,
    IonListHeader,
    IonAlert, IonLoading
} from '@ionic/react';
import './Home.css';
import {ItemProps} from "../model/ItemProps";
import ListItem from "../components/ListItem";
import {addOrder, getItems, newWebSocket} from "../Api";
import {AuthContext} from "../auth/AuthProvider";
import {getLogger} from "../core";

const log = getLogger('Home');

const Home: React.FC = () => {
    const {token} = useContext(AuthContext);
    const [orderedList, setOrderedList] = useState<ItemProps[]>([]);
    const [orderText, setOrderText] = useState("");
    const [fetchedList, setFetchedList] = useState<ItemProps[]>([]);
    const [inputTimer, setInputTimer] = useState<any>();
    const [selectedItem, setSelectedItem] = useState<ItemProps>();
    const [sendingOrder, setSendingOrder] = useState(false);

    useIonViewWillEnter(() => {
        const orders: ItemProps[] = JSON.parse(localStorage.getItem('orders') as string);
        if (orders)
            setOrderedList(orders);
    });

    const fetchOptions = (e: CustomEvent) => {
        console.log("asd");
        const text = e.detail.value || '';
        setOrderText(text);
        if (inputTimer)
            clearTimeout(inputTimer);

        if (!text || text === '') {
            console.log("bbb");
            setFetchedList([]);
            return;
        }

        const it = setTimeout(() => {
            console.log("zsd");
            //if (!fetching)
            fetchItems();

            async function fetchItems() {
                //setFetching(true);
                try {
                    const items = await getItems(text, token);
                    setFetchedList(items.slice(0, 5));
                } catch (error) {
                    log('fetchItems failed, message:' + error.message);
                }
            }

            setInputTimer(undefined);
        }, 2000);
        setInputTimer(it);
    };

    const clickHandler = (item: ItemProps) => {
        log('handleClick...');
        setSelectedItem(item);
    };

    const placeOrderHandler = (item: ItemProps, cant: number) => {
        log('handlePlaceOrder...');
        setSendingOrder(true);
        sendOrder();
        let success = true;

        async function sendOrder() {
            try {
                if (!item) {
                    setSendingOrder(false);
                    return;
                }
                item = {...item, quantity: cant};
                await addOrder(item, token);
            } catch (error) {
                log('send order failed: ' + error.message);
                success = false;
            }

            if (!success)
                item = {...item, failed: true};

            const items = orderedList;
            items.push(item);
            setOrderedList(items);

            localStorage.setItem('orders', JSON.stringify(items));

            setSendingOrder(false);
        }
    };

    useEffect(wsEffect, [token]);
    function wsEffect() {
        let canceled = false;
        log('wsEffect - connecting');
        let closeWebSocket: () => void;
        if (token) {
            closeWebSocket = newWebSocket(token, message => {
                if (canceled) {
                    return;
                }
                //const {type, payload: item} = message;
                log(`>>> ws message, item ${JSON.stringify(message)}`);
                //////
            });
        }
        return () => {
            log('wsEffect - disconnecting');
            canceled = true;
            closeWebSocket?.();
        }
    }

    return (
        <IonPage id="home-page">
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Inbox</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">
                            App
                        </IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonInput placeholder="Comanda" value={orderText} onIonChange={e => {
                    fetchOptions(e);
                }}/>
                <IonList>
                    {fetchedList.map(x => <ListItem key={x.code} code={x.code} name={x.name} quantity={x.quantity}
                                                    onClick={clickHandler}/>)}
                </IonList>

                <IonAlert isOpen={!!selectedItem}
                          onDidDismiss={() => setSelectedItem(undefined)}
                          header={"Comanda"}
                          message={selectedItem?.name}
                          inputs={[{name: "cantitate", type: "number", min: 1, value: 1}]}
                          buttons={[
                              {
                                  text: 'Cancel',
                                  role: 'cancel',
                                  cssClass: 'secondary',
                              },
                              {
                                  text: 'Ok',
                                  handler: (alertData) => {
                                      log('Ok buton alert, item: ' + selectedItem?.name + ' , cant: ' + alertData.cantitate);
                                      if (selectedItem)
                                          placeOrderHandler({...selectedItem}, alertData.cantitate);
                                  }
                              }
                          ]}/>

                <IonLoading isOpen={sendingOrder}/>
                <IonList>
                    <IonListHeader>Comenzi plasate:</IonListHeader>
                    {orderedList.map(x => <ListItem key={x.code} code={x.code} name={x.name} quantity={x.quantity}/>)}
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default Home;
