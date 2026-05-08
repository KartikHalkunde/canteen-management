package com.canteen.canteen_management.service;

import com.canteen.canteen_management.dto.CartItemDto;
import com.canteen.canteen_management.entity.MenuItem;
import com.canteen.canteen_management.repository.MenuItemRepository;
import com.canteen.canteen_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CartService {

    private final MenuItemRepository menuItemRepository;

    // Cart stored in memory per user: userId -> list of cart items
    private final Map<Long, List<CartItemDto>> cartStore = new HashMap<>();

    public List<CartItemDto> getCart(Long userId) {
        return cartStore.getOrDefault(userId, new ArrayList<>());
    }

    public List<CartItemDto> addToCart(Long userId, CartItemDto dto) {
        MenuItem item = menuItemRepository.findById(dto.getMenuItemId())
                .orElseThrow(() -> new RuntimeException("Menu item not found"));

        if (!item.getAvailable()) {
            throw new RuntimeException("Item is not available");
        }

        List<CartItemDto> cart = cartStore.getOrDefault(userId, new ArrayList<>());

        // if item already in cart, update quantity
        Optional<CartItemDto> existing = cart.stream()
                .filter(i -> i.getMenuItemId().equals(dto.getMenuItemId()))
                .findFirst();

        if (existing.isPresent()) {
            existing.get().setQuantity(existing.get().getQuantity() + dto.getQuantity());
        } else {
            cart.add(dto);
        }

        cartStore.put(userId, cart);
        return cart;
    }

    public List<CartItemDto> updateCartItem(Long userId, Long menuItemId, Integer quantity) {
        List<CartItemDto> cart = cartStore.getOrDefault(userId, new ArrayList<>());

        if (quantity <= 0) {
            cart.removeIf(i -> i.getMenuItemId().equals(menuItemId));
        } else {
            cart.stream()
                    .filter(i -> i.getMenuItemId().equals(menuItemId))
                    .findFirst()
                    .ifPresent(i -> i.setQuantity(quantity));
        }

        cartStore.put(userId, cart);
        return cart;
    }

    public void clearCart(Long userId) {
        cartStore.remove(userId);
    }

    public BigDecimal getCartTotal(Long userId) {
        List<CartItemDto> cart = getCart(userId);
        BigDecimal total = BigDecimal.ZERO;

        for (CartItemDto item : cart) {
            MenuItem menuItem = menuItemRepository.findById(item.getMenuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found"));
            total = total.add(menuItem.getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        return total;
    }
}