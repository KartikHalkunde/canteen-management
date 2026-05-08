package com.canteen.canteen_management.repository;

import com.canteen.canteen_management.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);
    List<Order> findByStatus(Order.OrderStatus status);
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findAllByOrderByCreatedAtAsc();

    @EntityGraph(attributePaths = "orderItems")
    Optional<Order> findWithItemsById(Long id);

    @EntityGraph(attributePaths = "orderItems")
    List<Order> findWithItemsByUserIdOrderByCreatedAtDesc(Long userId);
}