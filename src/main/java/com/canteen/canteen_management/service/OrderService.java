package com.canteen.canteen_management.service;

import com.canteen.canteen_management.dto.CartItemDto;
import com.canteen.canteen_management.dto.OrderRequestDto;
import com.canteen.canteen_management.entity.*;
import com.canteen.canteen_management.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final UserRepository userRepository;
    private final CartService cartService;

    @Transactional
    public Order placeOrder(Long userId, OrderRequestDto dto) {
        List<CartItemDto> cartItems = cartService.getCart(userId);

        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // calculate total
        BigDecimal total = cartService.getCartTotal(userId);

        // create order
        Order order = Order.builder()
                .user(user)
                .totalPrice(total)
                .paymentMethod(dto.getPaymentMethod())
                .paymentStatus(Order.PaymentStatus.PAID)
                .notes(dto.getNotes())
                .build();

        Order savedOrder = orderRepository.save(order);

        // create order items
        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItemDto cartItem : cartItems) {
            MenuItem menuItem = menuItemRepository.findById(cartItem.getMenuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found"));

            OrderItem orderItem = OrderItem.builder()
                    .order(savedOrder)
                    .menuItem(menuItem)
                    .quantity(cartItem.getQuantity())
                    .unitPrice(menuItem.getPrice()) // snapshot price
                    .build();

            orderItems.add(orderItem);
        }

        orderItemRepository.saveAll(orderItems);

        // clear cart after order placed
        cartService.clearCart(userId);

        // reload order with items
        return orderRepository.findById(savedOrder.getId())
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    public List<Order> getUserOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }
}