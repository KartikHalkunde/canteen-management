package com.canteen.canteen_management.controller;

import com.canteen.canteen_management.entity.Order;
import com.canteen.canteen_management.service.AdminOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    // Get all orders in FIFO queue (oldest first)
    @GetMapping("/queue")
    public ResponseEntity<List<Order>> getOrderQueue() {
        return ResponseEntity.ok(adminOrderService.getOrderQueue());
    }

    // Get orders by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Order>> getOrdersByStatus(@PathVariable Order.OrderStatus status) {
        return ResponseEntity.ok(adminOrderService.getOrdersByStatus(status));
    }

    // Get all orders (for admin dashboard overview)
    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(adminOrderService.getAllOrders());
    }

    // Update order status
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam Order.OrderStatus status) {
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, status));
    }

    // Mark order as preparing
    @PatchMapping("/{orderId}/prepare")
    public ResponseEntity<Order> markPreparing(@PathVariable Long orderId) {
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, Order.OrderStatus.PREPARING));
    }

    // Mark order as ready
    @PatchMapping("/{orderId}/ready")
    public ResponseEntity<Order> markReady(@PathVariable Long orderId) {
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, Order.OrderStatus.READY));
    }

    // Mark order as completed
    @PatchMapping("/{orderId}/complete")
    public ResponseEntity<Order> markCompleted(@PathVariable Long orderId) {
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, Order.OrderStatus.COMPLETED));
    }

    // Get order details
    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrderDetails(@PathVariable Long orderId) {
        return ResponseEntity.ok(adminOrderService.getOrderById(orderId));
    }
}