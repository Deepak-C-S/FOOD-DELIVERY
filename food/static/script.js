function getCSRFToken() {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

function showPopup(message, onOk) {
    const popup = document.getElementById('custom-popup');
    const messageNode = document.getElementById('custom-popup-message');
    const okBtn = document.getElementById('custom-popup-ok');
    if (!popup || !messageNode || !okBtn) return;

    messageNode.textContent = message;
    popup.classList.add('active');
    popup.setAttribute('aria-hidden', 'false');

    okBtn.onclick = () => {
        popup.classList.remove('active');
        popup.setAttribute('aria-hidden', 'true');
        if (typeof onOk === 'function') {
            onOk();
        }
    };
}

function showToast(title, message) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;

    toast.innerHTML = title ? `<strong>${title}</strong>${message || ''}` : (message || '');
    toast.classList.add('visible');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
        toast.classList.remove('visible');
    }, 2400);
}

async function postJSON(url, payload = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify(payload),
    });

    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
    }

    return data;
}

async function addToCart(foodId) {
    try {
        const data = await postJSON(`/add-to-cart/${foodId}/`);
        showToast('Added to cart', data.message || 'Item added successfully.');
    } catch (error) {
        showPopup(error.message || 'Failed to add item to cart.');
    }
}

async function updateQuantity(cartId) {
    const qtyInput = document.getElementById(`qty-${cartId}`);
    const quantity = qtyInput ? Number(qtyInput.value) : NaN;

    if (!Number.isFinite(quantity) || quantity < 1) {
        showPopup('Quantity must be at least 1.');
        return;
    }

    try {
        const data = await postJSON(`/update-cart-quantity/${cartId}/`, { quantity });
        showPopup(data.message || 'Quantity updated!', () => window.location.reload());
    } catch (error) {
        showPopup(error.message || 'Failed to update quantity.');
    }
}

function deleteItem(cartId) {
    showPopup('Remove this item from the cart?', async () => {
        try {
            const data = await postJSON(`/delete-cart-item/${cartId}/`);
            showPopup(data.message || 'Item removed!', () => window.location.reload());
        } catch (error) {
            showPopup(error.message || 'Failed to remove item.');
        }
    });
}

function showPaymentOptions() {
    const placeOrderBtn = document.getElementById('place-order-btn');
    const paymentOptions = document.getElementById('payment-options');
    if (placeOrderBtn) {
        placeOrderBtn.style.display = 'none';
    }
    if (paymentOptions) {
        paymentOptions.classList.add('visible');
    }
}

async function submitOrder(paymentMethod) {
    if (paymentMethod === 'online') {
        try {
            const data = await postJSON('/create-stripe-session/', {});
            if (data.session_url) {
                window.location.href = data.session_url;
                return;
            }
            showPopup(data.message || 'Failed to start payment.');
        } catch (error) {
            showPopup(error.message || 'Failed to start payment.');
        }
        return;
    }

    try {
        const data = await postJSON('/place-order/', { payment_method: paymentMethod });
        if (data.redirect_url) {
            showPopup(data.message || 'Order placed!', () => {
                window.location.href = data.redirect_url;
            });
            return;
        }
        if (data.message && data.message.toLowerCase().includes('cart is empty')) {
            showPopup(data.message, () => {
                window.location.href = '/cart/';
            });
            return;
        }
        showPopup(data.message || 'Order placed!');
    } catch (error) {
        showPopup(error.message || 'Failed to place order.');
    }
}

function deleteOrder(orderId) {
    showPopup('Delete this order history entry?', async () => {
        try {
            const data = await postJSON(`/delete-order/${orderId}/`);
            showPopup(data.message || 'Order deleted!', () => window.location.reload());
        } catch (error) {
            showPopup(error.message || 'Failed to delete order.');
        }
    });
}

function deleteAddress(addressId) {
    showPopup('Delete this saved address?', async () => {
        try {
            const data = await postJSON(`/delete-address/${addressId}/`);
            showToast('Address updated', data.message || 'Address deleted.');
            window.location.reload();
        } catch (error) {
            showPopup(error.message || 'Failed to delete address.');
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('food-search');
    if (!searchInput) {
        return;
    }

    const cards = Array.from(document.querySelectorAll('[data-food-card]'));
    const sync = () => {
        const term = searchInput.value.trim().toLowerCase();
        cards.forEach((card) => {
            const haystack = `${card.dataset.foodName || ''} ${card.dataset.foodDescription || ''}`.toLowerCase();
            card.style.display = haystack.includes(term) ? '' : 'none';
        });
    };

    searchInput.addEventListener('input', sync);
    sync();
}

function setupRevealAnimations() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length || !('IntersectionObserver' in window)) {
        items.forEach((item) => item.classList.add('in-view'));
        return;
    }

    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observerInstance.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
}

function setupAddToCart() {
    document.querySelectorAll('[data-food-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const foodId = button.getAttribute('data-food-id');
            if (foodId) {
                addToCart(foodId);
            }
        });
    });
}

function setupPopupDismiss() {
    const popup = document.getElementById('custom-popup');
    const okBtn = document.getElementById('custom-popup-ok');
    if (!popup || !okBtn) {
        return;
    }

    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            popup.classList.remove('active');
            popup.setAttribute('aria-hidden', 'true');
        }
    });

    okBtn.addEventListener('click', () => {
        popup.classList.remove('active');
        popup.setAttribute('aria-hidden', 'true');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupAddToCart();
    setupSearch();
    setupRevealAnimations();
    setupPopupDismiss();

    const placeOrderBtn = document.getElementById('place-order-btn');
    const emptyCartMsg = document.getElementById('empty-cart-msg');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', (event) => {
            if (emptyCartMsg && emptyCartMsg.offsetParent !== null) {
                event.preventDefault();
                showPopup('Your cart is empty.');
            }
        });
    }
});


