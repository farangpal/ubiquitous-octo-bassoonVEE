axios.defaults.withCredentials = true;

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});

function getConfig() {
    return new Promise((resolver, rejector) => {
        if (CacheManager.exists("jwt")) {
            const jwtKey = CacheManager.get("jwt");
            const cachedData = CacheManager.get(jwtKey);

            if (cachedData != null && cachedData != undefined && cachedData.jwt != null && cachedData.jwt != undefined) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${cachedData.jwt}`
                resolver(cachedData);
                return;
            }

            axios.defaults.headers.common['Authorization'] = null;
        }

        axios
            .get(`/config?dt=${new Date().getTime()}`)
            .then(res => {
                if (res.data.jwt) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.jwt}`
                    CacheManager.set("jwt", res.data.jwt);
                    CacheManager.set(res.data.jwt, res.data);
                } else {
                    axios.defaults.headers.common['Authorization'] = null;
                }
                resolver(res.data);
            });
    });
}

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, time);
    });
};

async function showNotEnoughEth(priceToCheck = 0) {
    const config = await getConfig();

    if (config.userBalance > priceToCheck) {
        return true;
    }

    const $notEnoughEth = $("#notEnoughEth");

    if ($notEnoughEth.length) {
        const notEnoughEthModal = new bootstrap.Modal($notEnoughEth);
        notEnoughEthModal.show();
    }

    appInsights.trackEvent(
        { name: "INSUFFICIENT_BALANCE" },
        { address: config.userAddress, priceToCheck: priceToCheck, userBalance: config.userBalance }
    );

    return false;
}

function validateEmail(email) {
    return email.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

function validatePhone(phone) {
    return phone.match(
        /^((\+[1-9]{1,4}[ \-]*)|(\([0-9]{2,3}\)[ \-]*)|([0-9]{2,4})[ \-]*)*?[0-9]{3,4}?[ \-]*[0-9]{3,4}?$/
    );
}

function isNullOrEmpty(input) {
    return (typeof (input) !== "string" || input === "" || input === " " || input === undefined || input === null);
};

function buildFormData(formData, data, parentKey) {
    if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
        Object.keys(data).forEach(key => {
            buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
        });
    } else {
        const value = data == null ? '' : data;
        formData.append(parentKey, value);
    }
};

function printDiv(elementId) {
    var divContents = document.getElementById(elementId).innerHTML;
    var a = window.open('', '', 'height=1024, width=1024');
    a.document.write('<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous"></head>');
    a.document.write('<body onload="window.print()">');
    a.document.write(divContents);
    a.document.write('</body></html>');
    a.document.close();
}

function jsonToFormData(data) {
    const formData = new FormData();
    buildFormData(formData, data);
    formData.append("__RequestVerificationToken", $("[name=__RequestVerificationToken]").val());
    return formData;
};

function logout() {
    sessionStorage.clear();
    localStorage.clear();
    CacheManager.clearAll();
    location.href = "/authentication/logout?returnUrl=" + encodeURIComponent(getReturnUrl());
};

function showError(errorMessage) {
    const $model = $("#errorModal");

    if (!$model) {
        return;
    }

    if (errorMessage) {
        $model.find("#errorMessage").html(errorMessage);
    }

    const modal = bootstrap.Modal.getOrCreateInstance($model);

    modal.show();
}

function getReturnUrl() {
    const returnUrlElement = document.createElement("a");
    returnUrlElement.href = location.href;
    let returnUrl = params.returnUrl;

    if (!returnUrl) {
        returnUrl = returnUrlElement.pathname;
    }

    return returnUrl;
}

function postForm(route, data, prefix = null) {
    const form = document.createElement("form");

    let paramSeperator = "?";

    if (route.includes("?")) {
        paramSeperator = "&";
    }

    form.setAttribute("method", "POST");
    form.setAttribute("action", route + paramSeperator + "returnUrl=" + encodeURIComponent(getReturnUrl()));

    const formData = jsonToFormData(data);
    const formEntries = [...formData.entries()];

    formEntries.forEach(item => {
        const key = item[0];
        const val = item[1];
        let prefixName = "";

        if (prefix !== null && key !== "__RequestVerificationToken") {
            prefixName = prefix + ".";
        }

        if (!key) {
            return;
        }

        if (!val) {
            return;
        }

        const hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "hidden");
        hiddenField.setAttribute("name", prefixName + key);
        hiddenField.setAttribute("value", val);
        form.appendChild(hiddenField);
    });

    document.body.appendChild(form);
    form.submit();
};

function showLoadingBtn(element, ignoreLoadingIcon = false) {
    const $actionBtn = $(element);
    $actionBtn.addClass("disabled");

    if (!ignoreLoadingIcon) {
        const $loading = $actionBtn.find(".spinner-border");
        const $icon = $actionBtn.find(".bi");
        $loading.removeClass("d-none");
        $icon.addClass("d-none");
    }
}

function hideLoadingBtn(element, ignoreLoadingIcon = false) {
    const $actionBtn = $(element);
    $actionBtn.removeClass("disabled");

    if (!ignoreLoadingIcon) {
        const $loading = $actionBtn.find(".spinner-border");
        const $icon = $actionBtn.find(".bi");
        $loading.addClass("d-none");
        $icon.removeClass("d-none");
    }
}

function isLoadingBtn(element) {
    const $actionBtn = $(element);
    const $loading = $actionBtn.find(".spinner-border");

    if (!$loading.length) {
        return false;
    }

    return !$loading.hasClass("d-none");
}

function makeTimer(element, dateTime) {
    let endTime = new Date(dateTime);
    endTime = (Date.parse(endTime) / 1000);

    let now = new Date();
    now = (Date.parse(now) / 1000);

    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
        element.find(".counter-days").html("0");
        element.find(".counter-hours").html("00");
        element.find(".counter-minutes").html("00");
        element.find(".counter-seconds").html("00");
        return;
    }

    let days = Math.floor(timeLeft / 86400);
    let hours = Math.floor((timeLeft - (days * 86400)) / 3600);
    let minutes = Math.floor((timeLeft - (days * 86400) - (hours * 3600)) / 60);
    let seconds = Math.floor((timeLeft - (days * 86400) - (hours * 3600) - (minutes * 60)));

    if (hours < "10") { hours = "0" + hours; }
    if (minutes < "10") { minutes = "0" + minutes; }
    if (seconds < "10") { seconds = "0" + seconds; }

    element.find(".counter-days").html(days);
    element.find(".counter-hours").html(hours);
    element.find(".counter-minutes").html(minutes);
    element.find(".counter-seconds").html(seconds);
}

function confetti() {
    const root = document.querySelector(':root');
    const vpWidth = root.getClientRects()[0].width;
    const vpHeight = root.getClientRects()[0].height;

    let lastX = 0;
    let lastY = 0;
    let ticking = false;

    const onMove = e => {
        lastX = e.clientX;
        lastY = e.clientY;
        requestTick();
    };

    const requestTick = () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    };

    const update = () => {
        const x = lastX / vpWidth * 2 - 1;
        const y = lastY / vpHeight * 2 - 1;

        root.style.setProperty('--x', x);
        root.style.setProperty('--y', y);

        ticking = false;
    };

    root.addEventListener('mousemove', onMove, { capture: false, passive: true });
}

class ApiClient {
    static _clientInstance = null;

    getOrder(orderId) {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .get(`${config.baseAddress}v2/orders/${orderId}?dt=${new Date().getTime()}`)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, res.data.data);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    getPriceOfInventory(type, quantity = 1) {
        return new Promise((resolver, rejector) => {
            axios
                .get(`/orders/${type}/estimate-price/${quantity}?dt=${new Date().getTime()}`)
                .then(res => {
                    resolver(res.data);
                }, (err) => {
                    const error = new ApiResponse(500, true, null, "An error occured");
                    rejector(error);
                });
        });
    }

    hasPendingPublicMintOrders() {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .get(`${config.baseAddress}v2/users/${config.userAddress}/orders?dt=${new Date().getTime()}`)
                .then(res => {
                    try {
                        if (res.data && res.data.data) {
                            const mappedOrdersToPublicAndStatus = res.data.data
                                .filter((order) => order.status !== "faulted" || order.status !== "completed" || order.status !== "cancelled");

                            if (mappedOrdersToPublicAndStatus && mappedOrdersToPublicAndStatus.length && mappedOrdersToPublicAndStatus.length > 0) {
                                resolver(true);
                                return;
                            }
                        }
                    } catch (err) {
                        resolver(false);
                        return;
                    }

                    resolver(false);
                }, (err) => {
                    resolver(false);
                });
        });
    }

    cancelOrder(orderId) {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .delete(`${config.baseAddress}v2/orders/${orderId}?dt=${new Date().getTime()}`)
                .then(async (res) => {
                    const success = new ApiResponse(res.status, false, null, null);
                    await delay(15000);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    async updateOrderPaymentDetails(orderId, payment) {
        const existingOrderResponse = await this.getOrder(orderId);
        const existingOrderData = existingOrderResponse.data;

        existingOrderData.status = "submitted";
        existingOrderData.payment.provider = "ethereum"; // ethereum
        existingOrderData.payment.transactionId = payment.transactionId; // transactionHash
        existingOrderData.payment.status = "pending";
        existingOrderData.payment.type = payment.type; // metamask

        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .post(`${config.baseAddress}v2/orders/${orderId}/submit`, existingOrderData)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, existingOrderData);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    async updateOrderUserDetails(orderId, formValues) {
        const existingOrderResponse = await this.getOrder(orderId);
        const existingOrderData = existingOrderResponse.data;

        existingOrderData.status = "confirmed";

        if (formValues) {
            existingOrderData.termsAgreement = formValues.termsAgreement;
            existingOrderData.forgoShippingInfo = formValues.forgoShippingInfo;

            if (!formValues.forgoShippingInfo) {
                existingOrderData.contactInfo.email = formValues.email;
                existingOrderData.contactInfo.name = formValues.name;
                existingOrderData.shippingInfo.shipToName = formValues.shipToName;
                existingOrderData.shippingInfo.address1 = formValues.addressLine1;
                existingOrderData.shippingInfo.address2 = formValues.addressLine2;
                existingOrderData.shippingInfo.city = formValues.city;
                existingOrderData.shippingInfo.country = formValues.country;
                existingOrderData.shippingInfo.countryCode = formValues.countryCode;
                existingOrderData.shippingInfo.phoneNumber = formValues.phoneNumber;
                existingOrderData.shippingInfo.state = formValues.state;
                existingOrderData.shippingInfo.zipCode = formValues.zip;
            } else {
                existingOrderData.contactInfo.email = "";
                existingOrderData.contactInfo.name = "";
                existingOrderData.shippingInfo.shipToName = "";
                existingOrderData.shippingInfo.address1 = "";
                existingOrderData.shippingInfo.address2 = "";
                existingOrderData.shippingInfo.city = "";
                existingOrderData.shippingInfo.countryCode = "";
                existingOrderData.shippingInfo.phoneNumber = "";
                existingOrderData.shippingInfo.state = "";
                existingOrderData.shippingInfo.zipCode = "";
            }
        }

        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .post(`${config.baseAddress}v2/orders/${orderId}/confirm`, existingOrderData)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, existingOrderData);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    checkEligibilityForSeries2ByUser() {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .get(`${config.baseAddress}v2/eligibility/VeefriendsV1-Claim/user/${config.userAddress}?dt=${new Date().getTime()}`)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, res.data);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    checkEligibilityForFriendsListByUser() {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .get(`${config.baseAddress}v2/eligibility/FriendsList-Claim/user/${config.userAddress}?dt=${new Date().getTime()}`)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, res.data);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    checkEligibilityForPublicMintByUser() {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .get(`${config.baseAddress}v2/eligibility/Public-Mint/user/${config.userAddress}?dt=${new Date().getTime()}`)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, res.data);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    checkEligibilityForFriendsListByTokenId(tokenId) {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            axios
                .get(`${config.baseAddress}v2/eligibility/VeefriendsV1-Claim/user/${config.userAddress}/token/${tokenId}?dt=${new Date().getTime()}`)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, res.data);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    createOrder(tokenIds, inventoryType) {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();

            const payload = {
                userId: config.userAddress,
                tokenIds: tokenIds,
                quantity: +(tokenIds.length),
                status: "pending",
                inventoryType: inventoryType
            };

            if (inventoryType === "FriendsList-Claim") {
                payload.tokenIds = [];
            }

            if (inventoryType === "Public-Mint") {
                payload.tokenIds = [];
            }

            axios
                .post(`${config.baseAddress}v2/orders`, payload)
                .then(res => {
                    const success = new ApiResponse(res.status, false, null, res.data);
                    resolver(success);
                }, (err) => {
                    const error = new ApiResponse(err.response.status, true, null, err.response.data);
                    rejector(error);
                });
        });
    }

    static BuildClient() {
        if (ApiClient._clientInstance !== null) {
            return ApiClient._clientInstance;
        }

        ApiClient._clientInstance = new ApiClient();

        return ApiClient._clientInstance;
    }
}

class ApiResponse {
    constructor(statusCode, isError, message, data) {
        this.statusCode = statusCode;
        this.isError = isError;
        this.message = message;
        this.data = data;
    }
}

class WalletConnection {
    static _clientInstance = null;

    static BuildWalletConnection() {
        if (WalletConnection._clientInstance !== null) {
            return WalletConnection._clientInstance;
        }

        WalletConnection._clientInstance = new WalletConnection();

        return WalletConnection._clientInstance;
    }

    constructor() {
        (async () => {
            const config = await getConfig();

            this.web3Modal = window.Web3Modal.default;
            this.walletConnectProvider = window.WalletConnectProvider.default;
            this.fortmatic = window.Fortmatic;
            this.network = window.evmChains.getChainByChainId(config.network).network;
            this.account = null;
            this.signatureMessage = config.signatureTemplate;
            this.nonce = config.nonce;
            this.w3m = null;
            this.currentProvider = null;
            this.baseAddress = config.v1BaseAddress;

            this.providerConfig = {
                network: this.network,
                disableInjectedProvider: false,
                cacheProvider: false,
                providerOptions: {
                    walletconnect: {
                        package: window.WalletConnectProvider.default,
                        options: {
                            infuraId: config.walletConnectId,
                            bridge: "https://veefriends.bridge.walletconnect.org"
                        }
                    },
                    portis: {
                        package: window.Portis,
                        options: {
                            id: config.portisId,
                            infuraId: config.walletConnectId
                        }
                    },
                    fortmatic: {
                        package: window.Fortmatic,
                        options: {
                            key: config.fortmaticKey,
                            infuraId: config.walletConnectId
                        }
                    }
                }
            };
        })();
    }

    async connect() {
        this.w3m = new this.web3Modal(this.providerConfig);

        this.currentProvider = await this.w3m.connect();

        await this.w3m.clearCachedProvider();

        return this.currentProvider;
    }

    async getProvider() {
        let provider = this.currentProvider || window.ethereum;

        if (!await this.isConnected()) {
            provider = await this.connect();
        }

        return provider;
    }

    async getWeb3() {
        const provider = await this.getProvider();

        // Subscribe to accounts change
        provider.on("accountsChanged", (accounts) => {
            logout();
        });

        // Subscribe to chainId change
        provider.on("chainChanged", async (chainId) => {
            logout();
        });

        // Subscribe to networkId change
        provider.on("networkChanged", async (networkId) => {
            logout();
        });

        return new Web3(provider);
    }

    async isConnected() {
        try {
            const accounts = window.ethereum
                ? await window.ethereum.request({ method: 'eth_accounts' })
                : await this.currentProvider.send("eth_accounts");

            let result = false;

            if (accounts && accounts.length > 0) {
                result = true;
            }

            return result;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async getAccount() {
        const web3 = await this.getWeb3();

        // Get list of accounts of the connected wallet
        const accounts = await web3.eth.getAccounts();

        // Go through all accounts and get their ETH balance
        const rowResolvers = accounts.map(async (address) => {
            const balance = await web3.eth.getBalance(address);
            const ethBalance = web3.utils.fromWei(balance, "ether");
            const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);

            return {
                balance: balance,
                ethBalance: ethBalance,
                humanFriendlyBalance: humanFriendlyBalance,
                address: address.toLowerCase(),
                network: this.network
            };
        });

        try {
            // Because rendering account does its own RPC commucation
            // with Ethereum node, we do not want to display any results
            // until data for all accounts is loaded
            let accounts = await Promise.all(rowResolvers);

            let account = accounts[0];

            if (account.network !== this.network) {
                return null;
            }

            return account;
        } catch (e) {
            console.error(e);
        }

        return null;
    }

    async login() {
        const params = await this.getAccount();
        const provider = await this.getProvider();

        const signatureMessage = this.signatureMessage
            .replace("{0}", this.baseAddress)
            .replace("{1}", this.nonce);

        const signature = provider.request
            ? await provider.request({
                method: 'personal_sign',
                params: [signatureMessage, params.address]
            })
            : await provider.send("personal_sign", [
                ethers.utils.hexlify(ethers.utils.toUtf8Bytes(signatureMessage)),
                params.address
            ]);

        params.signature = signature;
        params.sessionNonce = this.nonce;

        postForm("/authentication/login", params);
    }

    getLatestPrices(web3, orderId) {
        return new Promise(async (resolver, rejector) => {
            const connection = SignalRService.BuildService();
            const apiClient = ApiClient.BuildClient();

            await connection.onMessage(async function (message) {
                const pricing = await getPricing(apiClient, orderId);

                resolver(pricing);
            });

            await apiClient.updateOrderUserDetails(orderId, null);
        });

        async function getPricing(apiClient, orderId) {
            const orderResponse = await apiClient.getOrder(orderId);
            const gasResponse = await axios.get(`/orders/${orderId}/estimate-gas?dt=${new Date().getTime()}`);

            const fees = web3.utils.toBN(ethers.utils.parseEther(orderResponse.data.fees.toFixed(18)));
            const total = web3.utils.toBN(ethers.utils.parseEther(orderResponse.data.total.toFixed(18)));
            const gas = web3.utils.toBN(gasResponse.data.gasLimitString);

            return {
                fees: fees,
                total: total,
                gas: gas
            };
        }
    }

    makePayment(orderId, inventoryType, total, quantity, provider, onGasUpdate) {
        return new Promise(async (resolver, rejector) => {
            const config = await getConfig();
            const abi = [{ "inputs": [{ "internalType": "string", "name": "initialBaseUri", "type": "string" }, { "internalType": "string", "name": "contractName", "type": "string" }, { "internalType": "string", "name": "contractSymbol", "type": "string" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "string", "name": "orderId", "type": "string" }, { "indexed": false, "internalType": "string", "name": "inventoryType", "type": "string" }, { "indexed": false, "internalType": "uint256", "name": "quantity", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "buyer", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "minter", "type": "address" }, { "indexed": false, "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "OrderSubmitted", "type": "event" }, { "inputs": [{ "internalType": "string", "name": "orderId", "type": "string" }, { "internalType": "string", "name": "inventoryType", "type": "string" }, { "internalType": "uint256", "name": "quantity", "type": "uint256" }], "name": "submitOrder", "outputs": [], "stateMutability": "payable", "type": "function" }];
            const web3 = new Web3(provider);
            const contract = new web3.eth.Contract(abi, config.salesContract);
            const prices = await this.getLatestPrices(web3, orderId);

            if (onGasUpdate) {
                onGasUpdate(prices);
            }

            try {
                await contract
                    .methods
                    .submitOrder(orderId, inventoryType, quantity)
                    .send({
                        from: config.userAddress,
                        value: prices.total,
                        gas: prices.gas
                    }).on("transactionHash", function (transactionHash) {
                        resolver(transactionHash);
                    });
            } catch (err) {
                console.error(err);
                rejector(err);
            }
        });
    }

    getProviderInfo() {
        if (this.w3m !== null) {
            return this.w3m.providerController.injectedProvider;
        }

        return window.Web3Modal.getInjectedProvider();
    }

    logout() {
        logout();
    }
}

class SignalRService {
    static _clientInstance = null;

    constructor() {
        this.timer = null;
        this.connection = null;
        this.addedToGroup = false;
    }

    async start() {
        if (this.addedToGroup) {
            return;
        }

        const config = await getConfig();

        if (this.connection == null) {
            const connection = new signalR.HubConnectionBuilder()
                .withUrl(config.baseAddress + "veefriends")
                .configureLogging(signalR.LogLevel.Information)
                .withAutomaticReconnect()
                .build();

            connection
                .onclose(async () => {
                    await connection.start();
                });

            this.connection = connection;
        }

        if (this.connection.state === "Disconnected") {
            await this.connection.start();
        }

        this.userAddress = config.userAddress;

        await this.connection.invoke("addGroup", this.userAddress);

        this.addedToGroup = true;
    }

    async onMessage(onMessageCallback, timeoutInMs = 1200000000, ignoreErrors = false) {
        await this.start();

        if (!onMessageCallback) {
            return;
        }

        if (timeoutInMs == null || timeoutInMs == undefined) {
            timeoutInMs = 1200000000;
        }

        if (ignoreErrors == null || ignoreErrors == undefined) {
            ignoreErrors = false;
        }

        let timerHasTrigger = false;

        this.timer = setTimeout(() => {
            timerHasTrigger = true;
            onMessageCallback(null, new SignalRError("Timed out!"));

            appInsights.trackEvent(
                { name: "SIGNALR_ERROR" },
                { message: "Timed out!" }
            );
        }, timeoutInMs);

        this.connection.off("newMessage");
        this.connection.on("newMessage", (message) => {
            if (!message.userId) {
                console.warn("Message did not contain userAddress tag.", message);
                return;
            }

            if (message.userId.toLowerCase() !== this.userAddress.toLowerCase()) {
                console.warn("This message contained a different userAddress tag. ", message);
                return;
            }

            if (timerHasTrigger) {
                return;
            }

            if (message.statusCode) {
                if (ignoreErrors) {
                    onMessageCallback(message, null);
                } else {
                    appInsights.trackEvent(
                        { name: "SIGNALR_ERROR" },
                        { message: JSON.stringify(message) }
                    );

                    onMessageCallback(null, new SignalRError(message));
                }
            } else {
                onMessageCallback(message, null);
            }

            clearTimeout(this.timer);
            timerHasTrigger = false;
        });
    }

    static BuildService() {
        if (SignalRService._clientInstance !== null) {
            return SignalRService._clientInstance;
        }

        SignalRService._clientInstance = new SignalRService();

        return SignalRService._clientInstance;
    }
}

class CacheManager {
    static get _storageProvider() {
        return window["sessionStorage"];
    }

    static clear(name) {
        CacheManager._storageProvider.removeItem(name);
        CacheManager._storageProvider.removeItem(name + '_time');
    }

    static clearAll() {
        CacheManager._storageProvider.clear();
    }

    static set(name, value, expires = 240) {
        const date = new Date();
        const schedule = Math.round((date.setSeconds(date.getSeconds() + expires)) / 1000);

        CacheManager._storageProvider.setItem(name, JSON.stringify(value));
        CacheManager._storageProvider.setItem(name + '_time', schedule);
    }

    static get(name) {
        if (!CacheManager.exists(name)) {
            return null;
        }

        return JSON.parse(CacheManager._storageProvider.getItem(name));
    }

    static exists(name) {
        const date = new Date();
        const current = Math.round(+date / 1000);

        // Get Schedule
        let stored_time = CacheManager._storageProvider.getItem(name + '_time');

        if (stored_time == undefined || stored_time == 'null') {
            stored_time = 0;
        }

        // Expired
        if (stored_time < current) {
            CacheManager.clear(name);
            return false;
        }

        return true;
    }
}

class SignalRError {
    constructor(message) {
        this.message = message;
        this.createdAt = new Date();
    }

    toString() {
        if (!this.message.statusCode) {
            return this.message.toString();
        }

        if (this.message.messages.length) {
            return this.message.messages.join('. ');
        }

        return "An error occured.";
    }
}

class AddressFrom {
    static _clientInstance = null;

    makeRead() {
        const $el = $(".collectible-item");

        $([...Object.values(this.getDomElements())]).each((index, item) => {
            const $item = $(item);

            if ($item.is("[name=ForgoShippingInfo]")) {
                return;
            }

            if ($item.is("[id=Item1_TermsAgreement]")) {
                return;
            }

            $item.removeAttr("readonly");
            $item.removeAttr("disabled");
        });

        $el.show();
    }

    makeReadonly(applyToCheckbox) {
        const $el = $(".collectible-item");

        $([...Object.values(this.getDomElements())]).each((index, item) => {
            const $item = $(item);

            if ($item.is("[name=ForgoShippingInfo]")) {
                return;
            }

            if ($item.is("[id=Item1_TermsAgreement]")) {
                return;
            }

            $item.attr("readonly", "readonly");
            $item.attr("disabled", "disabled");
        });

        if (applyToCheckbox) {
            $("[name=ForgoShippingInfo]").attr("readonly", "readonly");
            $("[name=ForgoShippingInfo]").attr("disabled", "disabled");

            if (!$("[name=ForgoShippingInfo]").is(":checked")) {
                $el.show();
                return;
            }
        }

        $el.hide();
    }

    /**
     * Change fields to readonly
     */
    toggleReadonly() {
        $([...Object.values(this.getDomElements())]).each((index, item) => {
            const $item = $(item);

            if ($item.is("[name=ForgoShippingInfo]")) {
                return;
            }

            if ($item.is("[id=Item1_TermsAgreement]")) {
                return;
            }

            const readonly = $item.attr("readonly");

            if (readonly) {
                $item.removeAttr("readonly");
                $item.removeAttr("disabled");
                return;
            }

            $item.attr("readonly", "readonly");
            $item.attr("disabled", "disabled");
        })
    }

    /**
     * Handles form change event
     */
    onChange(callback) {
        if (!callback) {
            return;
        }

        const $forgoShippingCheckbox = $("#ForgoShippingInfo");

        callback(this.validateForm());

        if ($forgoShippingCheckbox.is(":checked")) {
            this.makeReadonly();
        } else {
            this.makeRead();
        }

        return $([...Object.values(this.getDomElements())])
            .off("change keyup").on("change keyup", (e) => {
                if (e.currentTarget.name === "ForgoShippingInfo") {
                    if (!e.currentTarget.checked) {
                        this.makeRead();
                    } else {
                        this.makeReadonly();
                        this.clearAddressForm();
                    }
                }

                $(e.currentTarget)
                    .addClass("dirty")
                    .removeClass("is-invalid");

                callback(this.validateForm())
            });
    }

    /**
     * Runs validation
     */
    validateForm() {
        const results = {
            isValid: true,
            errors: [],
            formValues: this.getAddressFormValues(),
            formElements: this.getDomElements(),
            displayFormErrors: () => {
                if (results.isValid) {
                    return;
                }

                results.errors.forEach((item) => {
                    const $item = $(item[1]);

                    $item
                        .removeClass("is-invalid")
                        .next(".invalid-tooltip")
                        .remove();

                    if (!$item.hasClass("dirty")) {
                        return;
                    }

                    $item
                        .addClass("is-invalid")
                        .after($("<div />", {
                            class: "invalid-tooltip",
                            text: item[0]
                        }));
                });
            },
            toString: () => {
                if (results.isValid) {
                    return;
                }

                return results.errors.map((item) => {
                    return `<li>${item[0]}</li>`;
                }).join('');
            }
        };

        if (!results.formValues.termsAgreement) {
            results.errors.push(["Please accept our terms and conditions.", results.formElements.termsAgreement]);
            results.isValid = false;
        }

        if (results.formValues.forgoShippingInfo) {
            return results;
        }

        if (isNullOrEmpty(results.formValues.name)) {
            results.errors.push(["Name provided was null or empty.", results.formElements.name]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.email)) {
            results.errors.push(["Email provided was null or empty.", results.formElements.email]);
            results.isValid = false;
        }

        if (!validateEmail(results.formValues.email)) {
            results.errors.push(["Email was invalid or malformed.", results.formElements.email]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.country)) {
            results.errors.push(["Country was not selected.", results.formElements.country]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.addressLine1)) {
            results.errors.push(["Street address was not provided.", results.formElements.addressLine1]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.city)) {
            results.errors.push(["City was not provided.", results.formElements.city]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.state)) {
            results.errors.push(["State was not provided.", results.formElements.state]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.zip)) {
            results.errors.push(["Postal code was not provided.", results.formElements.zip]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.phoneNumber)) {
            results.errors.push(["Phone number was not provided.", results.formElements.phoneNumber]);
            results.isValid = false;
        }

        if (!validatePhone(results.formValues.phoneNumber)) {
            results.errors.push(["Phone number was invalid.", results.formElements.phoneNumber]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.countryCode)) {
            results.errors.push(["Country code was not selected.", results.formElements.countryCode]);
            results.isValid = false;
        }

        if (isNullOrEmpty(results.formValues.shipToName)) {
            results.errors.push(["Shipping name provided was null or empty.", results.formElements.shipToName]);
            results.isValid = false;
        }

        return results;
    }

    /**
     * Get DOM elements
     */
    getDomElements() {
        return {
            country: document.querySelector("#ShippingInfo_Country"),
            addressLine1: document.querySelector("#ShippingInfo_Address1"),
            addressLine2: document.querySelector("#ShippingInfo_Address2"),
            city: document.querySelector("#ShippingInfo_City"),
            state: document.querySelector("#ShippingInfo_State"),
            zip: document.querySelector("#ShippingInfo_ZipCode"),
            name: document.querySelector("#ContactInfo_Name"),
            email: document.querySelector("#ContactInfo_Email"),
            phoneNumber: document.querySelector("#ShippingInfo_PhoneNumber"),
            forgoShippingInfo: document.querySelector("#ForgoShippingInfo"),
            termsAgreement: document.querySelector("#Item1_TermsAgreement"),
            shipToName: document.querySelector("#ShippingInfo_ShipToName"),
            countryCode: document.querySelector("#ShippingInfo_CountryCode")
        }
    };

    /**
     * Initialize Google AutoComplete
     */
    prefillAddressForm(shippingInfo, contactInfo) {
        const elements = this.getDomElements();

        if (shippingInfo) {
            elements.country.value = shippingInfo.country;
            elements.addressLine1.value = shippingInfo.address1;
            elements.addressLine2.value = shippingInfo.address2;
            elements.city.value = shippingInfo.city;
            elements.state.value = shippingInfo.state;
            elements.zip.value = shippingInfo.zipCode;
            elements.phoneNumber.value = shippingInfo.phoneNumber;
        }

        if (contactInfo) {
            elements.email.value = contactInfo.email;
            elements.name.value = contactInfo.name;
        }
    };

    /**
     * Initialize Google AutoComplete
     */
    clearAddressForm() {
        const elements = this.getDomElements();
        elements.country.value = null;
        elements.country.dispatchEvent(new Event('change'));
        elements.addressLine1.value = null;
        elements.addressLine1.dispatchEvent(new Event('change'));
        elements.addressLine2.value = null;
        elements.addressLine2.dispatchEvent(new Event('change'));
        elements.city.value = null;
        elements.city.dispatchEvent(new Event('change'));
        elements.state.value = null;
        elements.state.dispatchEvent(new Event('change'));
        elements.zip.value = null;
        elements.zip.dispatchEvent(new Event('change'));
        elements.name.value = null;
        elements.name.dispatchEvent(new Event('change'));
        elements.email.value = null;
        elements.email.dispatchEvent(new Event('change'));
        elements.phoneNumber.value = null;
        elements.phoneNumber.dispatchEvent(new Event('change'));
        //elements.forgoShippingInfo.checked = false;
        //elements.forgoShippingInfo.dispatchEvent(new Event('change'));
        elements.termsAgreement.checked = false;
        elements.termsAgreement.dispatchEvent(new Event('change'));
        elements.shipToName.value = null;
        elements.shipToName.dispatchEvent(new Event('change'));
        elements.countryCode.value = null;
        elements.countryCode.dispatchEvent(new Event('change'));
    };

    /**
     * Initialize Google AutoComplete
     */
    getAddressFormValues() {
        const elements = this.getDomElements();
        return {
            country: $.trim(elements.country.value || ""),
            addressLine1: $.trim(elements.addressLine1.value || ""),
            addressLine2: $.trim(elements.addressLine2.value || ""),
            city: $.trim(elements.city.value || ""),
            state: $.trim(elements.state.value || ""),
            zip: $.trim(elements.zip.value || ""),
            name: $.trim(elements.name.value || ""),
            email: $.trim(elements.email.value || ""),
            phoneNumber: $.trim(elements.phoneNumber.value || ""),
            forgoShippingInfo: elements.forgoShippingInfo.checked || false,
            termsAgreement: elements.termsAgreement.checked || false,
            shipToName: $.trim(elements.shipToName.value || ""),
            countryCode: $.trim(elements.countryCode.value || ""),
        }
    };

    /**
     * Initialize Google AutoComplete
     */
    initializeAutoComplete() {
        const elements = this.getDomElements();

        // $(elements.zip).mask('AAAAA-AAA');
        // $(elements.phoneNumber).mask('000-000-0000');

        let autocomplete;

        const fillInAddress = (autocomplete) => {
            // Get the place details from the autocomplete object.
            const place = autocomplete.getPlace();

            let address1 = "";
            let postalCode = "";

            // Get each component of the address from the place details,
            // and then fill-in the corresponding field on the form.
            // place.address_components are google.maps.GeocoderAddressComponent objects
            // which are documented at http://goo.gle/3l5i5Mr
            if (place) {
                for (const component of place.address_components) {
                    const componentType = component.types[0];

                    switch (componentType) {
                        case "street_number": {
                            address1 = `${component.long_name} ${address1}`;
                            break;
                        }

                        case "route": {
                            address1 += component.short_name;
                            break;
                        }

                        case "postal_code": {
                            postalCode = `${component.long_name}${postalCode}`;
                            break;
                        }

                        case "postal_code_suffix": {
                            postalCode = `${postalCode}-${component.long_name}`;
                            break;
                        }
                        case "locality":
                            elements.city.value = component.long_name;
                            elements.city.dispatchEvent(new Event('change'));
                            break;

                        case "administrative_area_level_1": {
                            elements.state.value = component.short_name;
                            elements.state.dispatchEvent(new Event('change'));
                            break;
                        }
                        case "country":
                            elements.country.value = component.long_name;
                            elements.country.dispatchEvent(new Event('change'));
                            break;
                    }
                }

                elements.addressLine1.value = address1;
                elements.addressLine1.dispatchEvent(new Event('change'));

                elements.zip.value = postalCode;
                elements.zip.dispatchEvent(new Event('change'));

                // After filling the form with address components from the Autocomplete
                // prediction, set cursor focus on the second address line to encourage
                // entry of subpremise information such as apartment, unit, or floor number.
                elements.addressLine2.focus();
            }
        }

        // Create the autocomplete object, restricting the search predictions to
        // addresses in the US and Canada.
        autocomplete = new google.maps.places.Autocomplete(elements.addressLine1, {
            fields: ["address_components", "geometry"],
            types: ["address"]
        });

        // When the user selects an address from the drop-down, populate the
        // address fields in the form.
        autocomplete.addListener("place_changed", () => {
            fillInAddress(autocomplete)
        });
    };

    /**
     * Builder/factory
     */
    static BuildService() {
        if (AddressFrom._clientInstance !== null) {
            return AddressFrom._clientInstance;
        }

        AddressFrom._clientInstance = new AddressFrom();

        return AddressFrom._clientInstance;
    }
}

class PageHandler {
    static _clientInstance = null;

    static BuildService() {
        if (PageHandler._clientInstance !== null) {
            return PageHandler._clientInstance;
        }

        PageHandler._clientInstance = new PageHandler();

        return PageHandler._clientInstance;
    }

    setupLogin() {
        const walletConnection = WalletConnection.BuildWalletConnection();
        const $actionBtn = $("#connectWallet");
        const $loading = $actionBtn.find(".spinner-border");
        const $icon = $actionBtn.find(".bi");

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                $actionBtn.addClass("disabled");
                $loading.removeClass("d-none");
                $icon.addClass("d-none");

                try {
                    await walletConnection.login();
                } catch (err) {
                    $actionBtn.removeClass("disabled");
                    $loading.addClass("d-none");
                    $icon.removeClass("d-none");
                    console.error(err);
                }
            });
    }

    setupOrderHistoryActions() {
        const $modalBtns = $(".updateOrderInformation");

        $modalBtns.each(function (index, el) {
            const $btn = $(el);

            $btn
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();
                    const modal = bootstrap.Modal.getOrCreateInstance($(this).prev());

                    modal.show();
                });
        })
    }

    async setupCartSummaryActions(orderView, orderStatus, orderId, inventoryType, orderTotal, orderQuantity) {
        const config = await getConfig();

        const $actionBtn = $("#connectWallet");
        const $cancelBtn = $("#cancelOrder");

        const addressForm = AddressFrom.BuildService();
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();
        const walletConnection = WalletConnection.BuildWalletConnection();

        await connection
            .onMessage((message, err) => {
                if (err) {
                    hideLoadingBtn($actionBtn);
                    hideLoadingBtn($cancelBtn, true);
                    location.href = `/incomplete-order/${orderId}`;
                    return;
                }

                if (!message.status || !message.id) {
                    hideLoadingBtn($actionBtn);
                    hideLoadingBtn($cancelBtn, true);
                    showError();
                    return;
                }

                if (message.id != orderId) {
                    return;
                }

                switch (message.status) {
                    case "cancelled":
                    case "faulted":
                        hideLoadingBtn($actionBtn);
                        hideLoadingBtn($cancelBtn, true);
                        location.href = `/incomplete-order/${orderId}`;
                        return;
                }

                // Note: form method POST does not like large arrays or... our model binding is effed (more likely)
                if (message.inventoryItems) {
                    delete message.inventoryItems;
                    delete message.trackingIds;
                }

                postForm("/order/" + orderId, message, "order");
            });

        switch (orderView) {
            case "Created":

                $actionBtn
                    .addClass("disabled")
                    .off("click")
                    .on("click", async (e) => {
                        e.preventDefault();

                        addressForm.makeReadonly(true);

                        showLoadingBtn($actionBtn);
                        showLoadingBtn($cancelBtn, true);

                        let formValues = addressForm.getAddressFormValues();

                        await apiClient
                            .updateOrderUserDetails(orderId, formValues);
                    });

                addressForm
                    .onChange(function (va) {
                        showLoadingBtn($actionBtn, true);

                        if (va.isValid) {
                            hideLoadingBtn($actionBtn, true);
                        }
                    });

                break;

            case "Incomplete":

                addressForm.makeReadonly(true);

                await connection
                    .onMessage((message, err) => {
                        if (err) {
                            hideLoadingBtn($actionBtn);
                            hideLoadingBtn($cancelBtn, true);
                            location.href = `/incomplete-order/${orderId}`;
                            return;
                        }

                        if (!message.status || !message.id) {
                            hideLoadingBtn($actionBtn);
                            hideLoadingBtn($cancelBtn, true);
                            showError();
                            return;
                        }

                        if (message.id != orderId) {
                            return;
                        }

                        switch (message.status) {
                            case "completed":
                            case "minting":
                                localStorage.removeItem(orderId);
                                break;
                            case "cancelled":
                            case "faulted":
                                hideLoadingBtn($actionBtn);
                                hideLoadingBtn($cancelBtn, true);
                                location.href = `/incomplete-order/${orderId}`;
                                return;
                        }

                        // Note: form method POST does not like large arrays or... our model binding is effed (more likely)
                        if (message.inventoryItems) {
                            delete message.inventoryItems;
                            delete message.trackingIds;
                        }

                        postForm("/order/" + orderId + "/payment", message, "order");
                    });

                if (orderStatus == "Processing" || orderStatus == "Submitted" || orderStatus == "Minting") {
                    showLoadingBtn($actionBtn);
                    showLoadingBtn($cancelBtn, true);

                    return;
                }

                $actionBtn
                    .removeClass("disabled")
                    .off("click")
                    .on("click", async (e) => {
                        e.preventDefault();

                        showLoadingBtn($actionBtn);
                        showLoadingBtn($cancelBtn, true);

                        let transactionId;
                        let provider;

                        try {
                            provider = await walletConnection.connect();
                        } catch (err) {
                            hideLoadingBtn($actionBtn);
                            hideLoadingBtn($cancelBtn, true);

                            appInsights.trackEvent(
                                { name: "FAILED_WALLETCONNECT" },
                                { orderId: orderId, orderQuantity: orderQuantity, inventoryType: inventoryType, err: JSON.stringify(err) }
                            );

                            return;
                        }

                        try {
                            transactionId = await walletConnection
                                .makePayment(orderId, inventoryType, orderTotal, orderQuantity, provider);
                        } catch (err) {
                            hideLoadingBtn($actionBtn);
                            hideLoadingBtn($cancelBtn, true);

                            appInsights.trackEvent(
                                { name: "FAILED_MAKEPAYMENT" },
                                { orderId: orderId, orderQuantity: orderQuantity, inventoryType: inventoryType, err: JSON.stringify(err) }
                            );

                            return;
                        }

                        let providerName = "WalletConnect";

                        try {
                            providerName = walletConnection.getProviderInfo().name;
                        }
                        catch (err) {
                            console.warn("Get provider info does not work on this wallet. Using 'WalletConnect' instead.", err);
                        }

                        const payload = {
                            type: providerName,
                            transactionId: transactionId,
                        };

                        localStorage.setItem(orderId, JSON.stringify({
                            transactionId: transactionId,
                            orderId: orderId,
                            inventoryType: inventoryType,
                            userAddress: config.userAddress,
                            orderTotal: orderTotal,
                            orderQuantity: orderQuantity,
                            createdAt: new Date(),
                            orderStatus: orderStatus,
                            payload: payload
                        }));

                        await connection
                            .onMessage((message, err) => {
                                if (err) {
                                    hideLoadingBtn($actionBtn);
                                    hideLoadingBtn($cancelBtn, true);
                                    location.href = `/incomplete-order/${orderId}`;
                                    return;
                                }

                                if (!message.status || !message.id) {
                                    hideLoadingBtn($actionBtn);
                                    hideLoadingBtn($cancelBtn, true);
                                    showError();
                                    return;
                                }

                                if (message.id != orderId) {
                                    return;
                                }

                                switch (message.status) {
                                    case "cancelled":
                                    case "faulted":
                                        hideLoadingBtn($actionBtn);
                                        hideLoadingBtn($cancelBtn, true);
                                        location.href = `/incomplete-order/${orderId}`;
                                        return;
                                }

                                // Note: form method POST does not like large arrays or... our model binding is effed (more likely)
                                if (message.inventoryItems) {
                                    delete message.inventoryItems;
                                    delete message.trackingIds;
                                }

                                postForm("/order/" + orderId, message, "order");
                            });

                        try {
                            await apiClient
                                .updateOrderPaymentDetails(orderId, payload);
                        } catch (err) {
                            hideLoadingBtn($actionBtn);
                            hideLoadingBtn($cancelBtn, true);
                            showError();

                            appInsights.trackEvent(
                                { name: "FAILED_UPDATEORDER" },
                                { orderId: orderId, orderQuantity: orderQuantity, inventoryType: inventoryType, payload: JSON.stringify(payload), err: JSON.stringify(err) },
                            )

                            return;
                        }
                    });

                break;
        }

        if ($cancelBtn.length) {
            $cancelBtn
                .off("click")
                .on("click", async function (e) {
                    showLoadingBtn($actionBtn, true);
                    showLoadingBtn($cancelBtn);

                    await apiClient
                        .cancelOrder(orderId);

                    location.href = `/incomplete-order/${orderId}`;
                });
        }
    }

    async setupSeries2EligibilityCheck() {
        const config = await getConfig();
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const notEligibleModal = bootstrap.Modal.getOrCreateInstance($("#connectWalletModal"));

        const $actionBtn = $("#checkEligibilityBtn");

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);

                await connection.onMessage((message, err) => {
                    if (err) {
                        hideLoadingBtn($actionBtn);
                        showError();
                        return;
                    }

                    if (!message.eligible || message.eligible == 0 || message.tokenIds.length == 0) {
                        hideLoadingBtn($actionBtn);
                        notEligibleModal.show();
                        return;
                    }

                    message.nonce = config.nonce;

                    if (message.inventoryItems) {
                        delete message.inventoryItems;
                        delete message.trackingIds;
                    }

                    postForm("/claim/series1", message);
                });

                try {
                    await apiClient.checkEligibilityForSeries2ByUser();
                } catch (e) {
                    hideLoadingBtn($actionBtn);
                    showError();
                }
            });
    }

    setupSeries2EligibilitySelector() {
        const maxAmount = 30;
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();
        const errorModel = bootstrap.Modal.getOrCreateInstance($("#connectWalletModal"));
        const $tokenSelector = $(".token-selector");
        const $currentSelectedCount = $("#currentSelectedCount");
        const $selectAllBtn = $("#selectAllBtn");
        const $clearAllBtn = $("#clearAllBtn");
        const $thumbailViewBiggerBtn = $("#thumbailViewBiggerBtn");
        const $thumbailViewSmallerBtn = $("#thumbailViewSmallerBtn");
        const $tokenContainer = $(".token-container");
        const $errorMessages = $("#errorMessages");
        const $actionBtn = $("#createOrder");

        (async function () {
            await connection.onMessage((message, err) => {
                if (err) {
                    const $li = $("<p />", {
                        class: "lead",
                        text: err.toString()
                    });

                    $errorMessages.append($li);
                    hideLoadingBtn($actionBtn);
                    errorModel.show();
                    return;
                }

                if (message.inventoryItems) {
                    delete message.inventoryItems;
                    delete message.trackingIds;
                }

                postForm("/claim/series1/completed?returnUrl=/claim/series1", message, "order");
            });
        })();

        $tokenSelector
            .off("click")
            .on("click", function (e) {
                if (isLoadingBtn($actionBtn)) {
                    return;
                }

                const selectedCount = $(".token-selector:checked").length;

                if (selectedCount > maxAmount) {
                    $(this).prop("checked", false);
                    return;
                }

                $currentSelectedCount.html(selectedCount == 0 ? '' : ` (${selectedCount})`);

                if (selectedCount > 0) {
                    $actionBtn.removeClass("disabled");
                } else {
                    $actionBtn.addClass("disabled");
                }
            });

        $selectAllBtn
            .off("click")
            .on("click", (e) => {
                e.preventDefault();

                if (isLoadingBtn($actionBtn)) {
                    return;
                }

                $tokenSelector.each((i, el) => {
                    const $el = $(el);

                    if ($el.is(":checked")) {
                        return;
                    }

                    if (i > maxAmount) {
                        return;
                    }

                    $el.click();
                });
            });

        $clearAllBtn
            .off("click")
            .on("click", (e) => {
                e.preventDefault();

                if ($actionBtn.hasClass("disabled")) {
                    return;
                }

                $tokenSelector.each((i, el) => {
                    const $el = $(el);

                    if (!$el.is(":checked")) {
                        return;
                    }

                    $el.click();
                });
            });

        $thumbailViewBiggerBtn
            .off("click")
            .on("click", (e) => {
                e.preventDefault();

                if ($tokenContainer.hasClass("col-4")) {
                    return;
                }

                $tokenContainer
                    .removeClass("col-3")
                    .addClass("col-4");
            });

        $thumbailViewSmallerBtn
            .off("click")
            .on("click", (e) => {
                e.preventDefault();

                if ($tokenContainer.hasClass("col-3")) {
                    return;
                }

                $tokenContainer
                    .removeClass("col-4")
                    .addClass("col-3");
            });

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);

                const ids = [];

                $tokenSelector.each((i, el) => {
                    const $el = $(el);

                    if (!$el.is(":checked")) {
                        return;
                    }

                    if (ids.length > maxAmount) {
                        return;
                    }

                    ids.push($el.attr("id"));
                });

                if (!ids.length) {
                    hideLoadingBtn($actionBtn);
                    return;
                }

                const priceToCheck = await apiClient.getPriceOfInventory("VeefriendsV1-Claim", ids.length);

                if (!await showNotEnoughEth(priceToCheck.priceNumber)) {
                    hideLoadingBtn($actionBtn);
                    return;
                }

                try {
                    await apiClient.createOrder(ids, "VeefriendsV1-Claim");
                } catch (e) {
                    hideLoadingBtn($actionBtn);
                    showError();
                    console.error(e);
                }
            });
    }

    setGameScore(scoreId, secretId) {
        const $action = $("#submitScore");

        $action
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                showLoadingBtn($action);

                postForm(`/game`, {
                    scoreId: scoreId,
                    secretId: secretId,
                    walletAddress: config.userAddress
                }, "game");
            })
    }

    setupLogout() {
        const $logoutButton = $("#disconnectWallet, #logoutBtn");
        const $incompleteOrders = $("#incompleteOrders");
        const apiClient = ApiClient.BuildClient();

        $logoutButton
            .off("click")
            .on("click", (e) => {
                e.preventDefault();
                logout();
            });

        if ($incompleteOrders.length) {
            const pendingOrders = new bootstrap.Modal($incompleteOrders);

            pendingOrders.show();

            $(".cancel-order")
                .off("click")
                .on("click", async function (e) {
                    e.preventDefault();

                    showLoadingBtn($(this));

                    try {
                        await apiClient
                            .cancelOrder($(this).data("orderid"));
                    } catch (err) {
                        hideLoadingBtn($(this));
                        console.error(err);
                        return;
                    }

                    pendingOrders.hide();
                    location.href = location.href;
                });
        }
    }

    setupErrorNotifications() {
        const toast = new bootstrap.Toast(document.getElementById("toast"));
        toast.show();
    }

    setupOrderReceipt() {
        const modalElement = $("#receiptModal")[0];
        const receiptModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        const $viewReceipt = $("#viewReceipt");
        const $downloadReceipt = $("#printReceipt");

        $viewReceipt
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                showLoadingBtn($viewReceipt, true);
                receiptModal.show();
            });

        $downloadReceipt
            .off("click")
            .on("click", function (e) {
                printDiv("receiptModal");
            });

        modalElement.addEventListener('hidden.bs.modal', function (e) {
            e.preventDefault();
            hideLoadingBtn($viewReceipt, true);
        });
    }

    setupTokenIdChecker() {
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const tokenCheckerModal = bootstrap.Modal.getOrCreateInstance($("#tokenIdCheckerModal"));
        const notAvailableTokenCheckerModal = bootstrap.Modal.getOrCreateInstance($("#notAvailableTokenIdCheckerModal"));
        const availableTokenCheckerModal = bootstrap.Modal.getOrCreateInstance($("#availableTokenCheckerModal"));
        const $tokenIdInput = $("#tokenIdInput");
        const $checkToken = $("#checkToken");
        const $actionBtn = $("#tokenChecker");

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                showLoadingBtn($actionBtn);

                tokenCheckerModal.show();

                await connection.onMessage((message, err) => {
                    tokenCheckerModal.hide();

                    hideLoadingBtn($actionBtn);
                    hideLoadingBtn($checkToken);

                    if (err) {
                        showError();
                        return;
                    }

                    if (!message.eligible || message.eligible == 0) {
                        notAvailableTokenCheckerModal.show();
                        return;
                    }

                    availableTokenCheckerModal.show();
                });

                $checkToken
                    .off("click")
                    .on("click", async (e) => {
                        showLoadingBtn($checkToken);
                        e.preventDefault();

                        try {
                            await apiClient.checkEligibilityForFriendsListByTokenId($tokenIdInput.val());
                        } catch (err) {
                            hideLoadingBtn($actionBtn);
                            hideLoadingBtn($checkToken);
                            tokenCheckerModal.hide();
                            showError();
                            console.error(err);
                        }
                    });
            });

        $("#tokenIdCheckerModal")[0].addEventListener('hidden.bs.modal', function (e) {
            e.preventDefault();
            hideLoadingBtn($actionBtn);
        });
    }

    setupFriendsList() {
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const notEligibleModal = bootstrap.Modal.getOrCreateInstance($("#connectWalletModal"));
        const $actionBtn = $("#checkEligibilityBtn");

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);

                await connection.onMessage((message, err) => {
                    if (err) {
                        hideLoadingBtn($actionBtn);
                        showError();
                        return;
                    }

                    if (!message.eligible || message.eligible == 0) {
                        hideLoadingBtn($actionBtn);
                        notEligibleModal.show();
                        return;
                    }

                    location.href = "/friends-list/completed?count=" + message.eligible;
                });

                await apiClient.checkEligibilityForFriendsListByUser();
            });
    }

    setupFriendsListClaim() {
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const notEligibleModal = bootstrap.Modal.getOrCreateInstance($("#connectWalletModal"));
        const $actionBtn = $("#checkEligibilityBtn");

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);

                await connection.onMessage((message, err) => {
                    if (err) {
                        hideLoadingBtn($actionBtn);
                        showError();
                        return;
                    }

                    if (!message.eligible || message.eligible == 0) {
                        hideLoadingBtn($actionBtn);
                        notEligibleModal.show();
                        return;
                    }

                    postForm(`/`, message, "eligible");
                });

                await apiClient.checkEligibilityForFriendsListByUser();
            });
    }

    setupPublicMint() {
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const $actionBtn = $("#mintBtn");

        let currentCount = 1;

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);

                await connection.onMessage((message, err) => {
                    if (err) {
                        showError();
                        hideLoadingBtn($actionBtn);
                        return;
                    }

                    if (message.inventoryItems) {
                        delete message.inventoryItems;
                        delete message.trackingIds;
                    }

                    postForm("/public-mint", message, "order");
                });

                const priceToCheck = await apiClient.getPriceOfInventory("Public-Mint", currentCount);

                if (!await showNotEnoughEth(priceToCheck.priceNumber)) {
                    hideLoadingBtn($actionBtn);
                    showStepper();
                    return;
                }

                await apiClient.createOrder(new Array(currentCount), "Public-Mint");
            });
    }

    setupPublicMintClaim() {
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const notEligibleModal = bootstrap.Modal.getOrCreateInstance($("#connectWalletModal"));
        const orderStillProcessingModal = bootstrap.Modal.getOrCreateInstance($("#orderStillProcessingModal"));

        const $actionBtn = $("#checkEligibilityBtn");

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);

                await connection.onMessage(async (message, err) => {
                    if (err) {
                        hideLoadingBtn($actionBtn);
                        showError();
                        return;
                    }

                    if (!message.eligible || message.eligible == 0) {
                        hideLoadingBtn($actionBtn);

                        const hasPending = await apiClient.hasPendingPublicMintOrders();

                        if (hasPending) {
                            orderStillProcessingModal.show();
                        } else {
                            notEligibleModal.show();
                        }

                        return;
                    }

                    postForm(`/`, message, "eligible");
                });

                await apiClient.checkEligibilityForPublicMintByUser();
            });
    }

    setupCountdown(element, date) {
        setInterval(() => makeTimer(element, date), 1000);
    }

    setupStepper(elementId, maxLimit = 1) {
        const $element = $("#" + elementId);

        if (!$element.length) {
            return;
        }

        if (maxLimit > 30) {
            maxLimit = 30;
        }

        let currentCount = 1;

        const $stepUp = $element.find(".stepper-stepup");
        const $stepDown = $element.find(".stepper-stepdown");
        const $val = $element.find(".stepper-content");

        const showStepper = function () {
            $element.removeClass("active");
        };

        const hideStepper = function () {
            $element.addClass("active");
        }

        $stepUp
            .off("click")
            .on("click", (e) => {
                e.preventDefault();

                if (currentCount == maxLimit) {
                    return;
                }

                currentCount = currentCount + 1;
                $element.data("value", currentCount);
                $val.text(currentCount);
                $element.trigger("stepper", [currentCount, showStepper, hideStepper])
            });

        $stepDown
            .off("click")
            .on("click", (e) => {
                e.preventDefault();

                if (currentCount == 1) {
                    return;
                }

                currentCount = currentCount - 1;
                $element.data("value", currentCount);
                $val.text(currentCount);
                $element.trigger("stepper", [currentCount, showStepper, hideStepper])
            });
    }

    setupFriendsListMint() {
        const apiClient = ApiClient.BuildClient();
        const connection = SignalRService.BuildService();

        const $actionBtn = $("#mintBtn");
        const $stepper = $(".stepper-container");

        let currentCount = 1;
        let hideStepper = $.noop;
        let showStepper = $.noop;

        $stepper.on("stepper", function (ev, count, showStepperEv, hideStepperEv) {
            showStepper = showStepperEv;
            hideStepper = hideStepperEv;
            currentCount = count;
        });

        $actionBtn
            .off("click")
            .on("click", async (e) => {
                e.preventDefault();

                if (!await showNotEnoughEth()) {
                    return;
                }

                showLoadingBtn($actionBtn);
                hideStepper();

                await connection.onMessage((message, err) => {
                    if (err) {
                        showError();
                        hideLoadingBtn($actionBtn);
                        showStepper();
                        return;
                    }

                    if (message.inventoryItems) {
                        delete message.inventoryItems;
                        delete message.trackingIds;
                    }

                    postForm("/friends-list/claim", message, "order");
                });

                if (currentCount > 30) {
                    currentCount = 30;
                }

                const priceToCheck = await apiClient.getPriceOfInventory("FriendsList-Claim", currentCount);

                if (!await showNotEnoughEth(priceToCheck.priceNumber)) {
                    hideLoadingBtn($actionBtn);
                    showStepper();
                    return;
                }

                await apiClient.createOrder(new Array(currentCount), "FriendsList-Claim");
            });
    }

    clearSession() {
        try {
            document.cookie.split(";").forEach(function (c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            window.localStorage.clear();
            window.sessionStorage.clear();
        } catch (err) {
            console.err(err);
        }
    }

    setupNewsletter() {
        const $element = $("#newletterInput");
        const $action = $element.next("a");

        $action.off("click").on("click", function (e) {
            e.preventDefault();

            const email = $element.val().trim().toLowerCase();

            if (email === undefined || email === null || email === "") {
                return;
            }

            postForm("/newsletter", { emailAddress: email }, "newsletter");
        });
    }

    async setupCookieConsent() {
        if (cookieStore) {
            const warning = await cookieStore.get("warning");

            if (warning !== null) {
                return;
            }
        }

        const $element = $("#cookieConsent")
            .delay(250)
            .slideDown(250, function () {
                const $action = $element.find("#acceptBtn");

                $action
                    .off("click")
                    .on("click", function (e) {
                        e.preventDefault();
                        showLoadingBtn($action);

                        $element.slideUp(async function () {
                            hideLoadingBtn($action);

                            if (cookieStore) {
                                await cookieStore.set("warning", 1);
                            }
                        })
                    });
            });
    }
}