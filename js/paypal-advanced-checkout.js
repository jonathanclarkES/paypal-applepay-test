// Render the button component
paypal
    .Buttons({
        // Sets up the transaction when a payment button is clicked
        createOrder: createOrderCallback,
        onApprove: onApproveCallback,
        onError: function (error) {
            console.log('error here');
        },

        style: {
            shape: "rect",
            layout: "vertical",
            color: "gold",
            label: "paypal",
        },
    })
    .render("#paypal-button-container");

// Render each field after checking for eligibility
const cardField = window.paypal.CardFields({
    createOrder: createOrderCallback,
    onApprove: onApproveCallback,
    style: {
        input: {
            "font-size": "16px",
            "font-family": "courier, monospace",
            "font-weight": "lighter",
            color: "#ccc",
        },
        ".invalid": {color: "purple"},
    },
    onError: (err) => {
        console.log(err);
        // redirect to your specific error page
        // window.location.assign("/your-error-page-here");
    },
});

if (cardField.isEligible()) {
    const nameField = cardField.NameField({
        style: {input: {color: "blue"}, ".invalid": {color: "purple"}},
    });
    nameField.render("#card-name-field-container");

    const numberField = cardField.NumberField({
        style: {input: {color: "blue"}},
    });
    numberField.render("#card-number-field-container");

    const cvvField = cardField.CVVField({
        style: {input: {color: "blue"}},
    });
    cvvField.render("#card-cvv-field-container");

    const expiryField = cardField.ExpiryField({
        style: {input: {color: "blue"}},
    });
    expiryField.render("#card-expiry-field-container");

    // Add click listener to submit button and call the submit function on the CardField component
    document
        .getElementById("card-field-submit-button")
        .addEventListener("click", () => {
            cardField
                .submit({
                    // From your billing address fields
                    // billingAddress: {
                    //     addressLine1: document.getElementById(
                    //         "card-billing-address-line-1"
                    //     ).value,
                    //     addressLine2: document.getElementById(
                    //         "card-billing-address-line-2"
                    //     ).value,
                    //     adminArea1: document.getElementById(
                    //         "card-billing-address-admin-area-line-1"
                    //     ).value,
                    //     adminArea2: document.getElementById(
                    //         "card-billing-address-admin-area-line-2"
                    //     ).value,
                    //     countryCode: document.getElementById(
                    //         "card-billing-address-country-code"
                    //     ).value,
                    //     postalCode: document.getElementById(
                    //         "card-billing-address-postal-code"
                    //     ).value,
                    // },

                })
                .then(() => {
                    // submit successful
                });
        });
}


async function createOrderCallback() {
    console.log('create Order');
    resultMessage("Processing...");
    try {
        const response = await fetch("/createOrder.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // use the "body" param to optionally pass additional order information
            // like product ids and quantities
            body: JSON.stringify({
                // being set in the paypal api controller instead
                // cart: [
                //     {
                //         id: 1234,
                //         quantity: 1,
                //     },
                // ],
            }),
        });

        const orderData = await response.json();
        console.log('response from api:');
        console.log(orderData);

        if (orderData.id) {
            return orderData.id;
        } else {
            const errorDetail = orderData?.details?.[0];
            const errorMessage = errorDetail
                ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                : JSON.stringify(orderData);

            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
    }
}

async function onApproveCallback(data, actions) {
    try {
        const response = await fetch(`/paypal/api/orders/${data.orderID}/capture`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message

        const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
        const errorDetail = orderData?.details?.[0];

        // this actions.restart() behavior only applies to the Buttons component
        if (
            errorDetail?.issue === "INSTRUMENT_DECLINED" &&
            !data.card &&
            actions
        ) {
            // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
            // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
            return actions.restart();
        } else if (
            errorDetail ||
            !transaction ||
            transaction.status === "DECLINED"
        ) {
            // (2) Other non-recoverable errors -> Show a failure message
            console.log('here');
            console.log(orderData);
            let errorMessage;
            if (transaction) {
                errorMessage = `Transaction ${transaction.status}: ${transaction.id}`;
            } else if (errorDetail) {
                errorMessage = `${errorDetail.description} (${orderData.debug_id})`;
            } else {
                errorMessage = JSON.stringify(orderData);
            }

            throw new Error(errorMessage);
        } else {
            // (3) Successful transaction -> Show confirmation or thank you message
            // Or go to another URL:  actions.redirect('thank_you.html');
            if (transaction.status === "COMPLETED") {
                window.location.replace("/checkout/complete");
            }
            // resultMessage(
            //     `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`
            // );
            // console.log(
            //     "Capture result",
            //     orderData,
            //     JSON.stringify(orderData, null, 2)
            // );
        }
    } catch (error) {
        console.error(error);
        resultMessage(
            `Sorry, your transaction could not be processed...<br><br>${error}`
        );
    }
}

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
    const container = document.querySelector("#result-message");
    let resultAlertWrapper = document.querySelector('#result-message').parentElement;
    let resultContainerWrapper = document.querySelector('#result-message').parentElement.parentElement;
    resultContainerWrapper.classList.remove('hidden');
    container.innerHTML = message;
}




let check_applepay = async () => {
    return new Promise((resolve, reject) => {
        let error_message = "";
        if (!window.ApplePaySession) {
          error_message = "This device does not support Apple Pay";
        } else
        if (!ApplePaySession.canMakePayments()) {
          error_message = "This device, although an Apple device, is not capable of making Apple Pay payments";
        }
        if (error_message !== "") {
          reject(error_message);
        } else {
          resolve();
        }
      });
  };
  //Begin Displaying of ApplePay Button
  check_applepay()
  .then(() => {
    applepay = paypal.Applepay();
    applepay.config()
    .then(applepay_config => {
      if (applepay_config.isEligible) {
        document.getElementById("applepay-container").innerHTML = '<apple-pay-button id="applepay_button" buttonstyle="black" type="plain" locale="en">';
        global_apple_pay_config = applepay_config;
        document.getElementById("applepay_button").addEventListener("click", handle_applepay_clicked);
      }
    })
    .catch(applepay_config_error => {
      console.error('Error while fetching Apple Pay configuration:');
      console.error(applepay_config_error);
    });
  })
  .catch((error) => {
    console.error(error);
  });
  let ap_payment_authed = (event) => {
      applepay_payment_event = event.payment;
      fetch("/create_order", {
          method: "post", headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ "intent": intent })
      })
      .then((response) => response.json())
      .then((pp_data) => {
        pp_order_id = pp_data.id;
        apple_pay_email = applepay_payment_event.shippingContact.emailAddress;
        applepay.confirmOrder({
        orderId: pp_order_id,
        token: applepay_payment_event.token,
        billingContact: applepay_payment_event.billingContact
      })
      .then(confirmResult => {
        fetch("/complete_order", {
          method: "post", headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
              "intent": intent,
              "order_id": pp_order_id,
              "email": apple_pay_email
          })
      })
      .then((response) => response.json())
      .then((order_details) => {
        let intent_object = intent === "authorize" ? "authorizations" : "captures";
        if (order_details.purchase_units[0].payments[intent_object][0].status === "COMPLETED") {
          current_ap_session.completePayment(ApplePaySession.STATUS_SUCCESS);
          display_success_message({"order_details": order_details, "paypal_buttons": paypal_buttons});
        } else {
          current_ap_session.completePayment(ApplePaySession.STATUS_FAILURE);
          console.log(order_details);
          throw error("payment was not completed, please view console for more information");
        }
       })
       .catch((error) => {
          console.log(error);
          display_error_alert();
       });
      })
      .catch(confirmError => {
        if (confirmError) {
          console.error('Error confirming order with applepay token');
          console.error(confirmError);
          current_ap_session.completePayment(ApplePaySession.STATUS_FAILURE);
          display_error_alert();
        }
      });
    });
  };
  let ap_validate = (event) => {
    applepay.validateMerchant({
      validationUrl: event.validationURL,
      displayName: "My Demo Company"
    })
    .then(validateResult => {
      current_ap_session.completeMerchantValidation(validateResult.merchantSession);
    })
    .catch(validateError => {
      console.error(validateError);
      current_ap_session.abort();
    });
  };
  let handle_applepay_clicked = (event) => {
    const payment_request = {
      countryCode: global_apple_pay_config.countryCode,
      merchantCapabilities: global_apple_pay_config.merchantCapabilities,
      supportedNetworks: global_apple_pay_config.supportedNetworks,
      currencyCode: "GBP",
      requiredShippingContactFields: ["name", "phone", "email", "postalAddress"],
      requiredBillingContactFields: ["postalAddress"],
      total: {
        label: "My Demo Company",
        type: "final",
        amount: "100.0",
      }
    };
    current_ap_session = new ApplePaySession(4, payment_request);
    current_ap_session.onvalidatemerchant = ap_validate;
    current_ap_session.onpaymentauthorized = ap_payment_authed;
    current_ap_session.begin()
  };