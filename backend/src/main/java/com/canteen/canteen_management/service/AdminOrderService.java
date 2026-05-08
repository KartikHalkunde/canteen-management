package com.canteen.canteen_management.service;

import com.canteen.canteen_management.entity.Order;
import com.canteen.canteen_management.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final OrderRepository orderRepository;
    private final SseService sseService;

    public List<Order> getOrderQueue() {
        return orderRepository.findAllByOrderByCreatedAtAsc();
    }

    public List<Order> getOrdersByStatus(Order.OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, Order.OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);

        // Send notification when order is ready
        if (newStatus == Order.OrderStatus.READY) {
            String itemSummary = order.getOrderItems().stream()
                .map(item -> String.format("%dx %s", item.getQuantity(), item.getMenuItem().getName()))
                .reduce((left, right) -> left + ", " + right)
                .orElse("your order");

            sseService.sendNotification(
                    order.getUser().getId(),
                    "order-ready",
                "Your order is ready: " + itemSummary + ". Please pick it up before it gets cold."
            );
        }

        return savedOrder;
    }

    public Order getOrderById(Long orderId) {
        return orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }
}