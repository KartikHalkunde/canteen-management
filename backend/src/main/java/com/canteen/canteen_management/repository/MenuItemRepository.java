package com.canteen.canteen_management.repository;

import com.canteen.canteen_management.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByCategoryId(Long categoryId);
    List<MenuItem> findByAvailableTrue();
    List<MenuItem> findByCategoryIdAndAvailableTrue(Long categoryId);
}